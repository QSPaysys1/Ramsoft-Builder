import { JsonPipe, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthToastService } from '@ramsoft-builder/auth/ui/login';
import { AuthStore } from '@ramsoft-builder/auth/data-access/auth';
import {
  EwaybillRepository,
  EwaybillStore,
  GstZenEwbApiService,
  GstZenEwbHeaderPrefsService,
  EwbGstZenApiError,
} from '@ramsoft-builder/ewaybills/data-access/ewb';
import type {
  EwaybillDbRow,
  EwaybillListView,
  EwaybillSavedListTransportFilter,
  EwbExtendRequest,
} from '@ramsoft-builder/ewaybills/models/ewb';
import { EwbInlineAlertComponent } from '@ramsoft-builder/ewaybills/ui/form';
import { EwbSavedBillsTableComponent } from '@ramsoft-builder/ewaybills/ui/table';
import {
  EWB_EXTEND_UI_CONSIGNMENT_STATUS,
  EWB_EXTEND_UI_EXTN_REASONS,
  EWB_EXTEND_UI_TRANS_MODES,
  buildExtendDraftFromEwaybillRow,
  filterEwaybillListByTransport,
  gstinValidator,
  mapFormValuesToEwbExtendRequest,
  mergeGetEwbIntoExtendDraft,
  normalizeEwbTransModeForApi,
  transDocDateToDateInputValue,
  type EwbExtendDraftFormValues,
} from '@ramsoft-builder/ewaybills/utils/core';
import { finalize, startWith } from 'rxjs';
import { buildEwbExtendMovementFormGroup } from '../ewb-extend-movement.form';

function pickValidUptoFromExtendRaw(raw: Record<string, unknown> | null): string {
  if (!raw) {
    return '';
  }
  for (const k of [
    'ValidUpto',
    'validUpto',
    'ExtnValidUpto',
    'extnValidUpto',
    'ExtendedValidUpto',
    'extendedValidUpto',
    'VehUpdDate',
    'vehUpdDate',
  ]) {
    const v = raw[k];
    if (typeof v === 'string' && v.trim()) {
      return v.trim();
    }
  }
  return '';
}

@Component({
  standalone: true,
  selector: 'lib-initiate-multi-vehicle-movement-page',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    JsonPipe,
    EwbInlineAlertComponent,
    EwbSavedBillsTableComponent,
  ],
  templateUrl: './initiate-multi-vehicle-movement.page.html',
  styleUrls: ['./create-ewaybill.page.scss', './update-part-b.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InitiateMultiVehicleMovementPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly authStore = inject(AuthStore);
  private readonly repo = inject(EwaybillRepository);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly toast = inject(AuthToastService);
  protected readonly store = inject(EwaybillStore);
  private readonly api = inject(GstZenEwbApiService);
  protected readonly headerPrefs = inject(GstZenEwbHeaderPrefsService);

  protected readonly transModes = EWB_EXTEND_UI_TRANS_MODES;
  protected readonly extnReasons = EWB_EXTEND_UI_EXTN_REASONS;
  protected readonly consignmentStatuses = EWB_EXTEND_UI_CONSIGNMENT_STATUS;

  protected readonly transportFilter = signal<EwaybillSavedListTransportFilter>('all');
  protected readonly selectedEwaybillId = signal<string | null>(null);
  protected readonly selectedEwbNo = signal<number | null>(null);
  protected readonly fullRow = signal<EwaybillDbRow | null>(null);
  protected readonly loadRowError = signal<string | null>(null);
  protected readonly baseDraft = signal<EwbExtendDraftFormValues | null>(null);

  protected readonly filteredRows = computed(() =>
    filterEwaybillListByTransport(this.store.list(), this.transportFilter()),
  );

  protected readonly listEmptyHint = computed(() =>
    this.store.list().length === 0
      ? 'No saved e-way bills yet.'
      : 'No e-way bills match this filter.',
  );

  protected readonly movementForm = buildEwbExtendMovementFormGroup(this.fb);

  private readonly formTick = toSignal(this.movementForm.valueChanges.pipe(startWith(null)), {
    initialValue: null,
  });

  protected readonly previewPayload = computed((): EwbExtendRequest | null => {
    void this.formTick();
    const ewbNo = this.selectedEwbNo();
    const base = this.baseDraft();
    if (ewbNo == null || !base) {
      return null;
    }
    const v = this.movementForm.getRawValue();
    const merged: EwbExtendDraftFormValues = {
      ...base,
      ...v,
      fromState: Number(v.fromState),
      fromPincode: Number(v.fromPincode),
      remainingDistance: Number(v.remainingDistance),
      consignmentStatus: v.consignmentStatus,
    };
    return mapFormValuesToEwbExtendRequest(ewbNo, merged);
  });

  protected readonly fetchLoading = signal(false);
  protected readonly fetchError = signal<string | null>(null);
  protected readonly copyHint = signal<string | null>(null);

  constructor() {
    void this.store.loadList();
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((qp) => {
      const id = qp.get('id')?.trim() || null;
      if (id) {
        void this.selectByEwaybillId(id);
      }
    });
  }

  protected onTransportFilterChange(f: EwaybillSavedListTransportFilter): void {
    this.transportFilter.set(f);
  }

  protected onRowSelected(row: EwaybillListView): void {
    void this.selectByEwaybillId(row.id);
  }

  private patchFormFromDraft(d: EwbExtendDraftFormValues): void {
    this.movementForm.patchValue({
      vehicleNo: d.vehicleNo,
      fromPlace: d.fromPlace,
      fromState: d.fromState || 0,
      fromPincode: d.fromPincode || (0 as number),
      remainingDistance: d.remainingDistance || 0,
      transDocNo: d.transDocNo,
      transDocDate: transDocDateToDateInputValue(d.transDocDate),
      transMode: normalizeEwbTransModeForApi(d.transMode),
      extnRsnCode: String(d.extnRsnCode ?? '1'),
      extnRemarks: d.extnRemarks,
      transitType: d.transitType,
      consignmentStatus: d.consignmentStatus === 'T' ? 'T' : 'M',
    });
  }

  private async selectByEwaybillId(id: string): Promise<void> {
    this.store.resetMultiVehicleUi();
    this.store.dismissMultiVehicleError();
    this.selectedEwaybillId.set(id);
    this.selectedEwbNo.set(null);
    this.loadRowError.set(null);
    this.fullRow.set(null);
    this.baseDraft.set(null);
    this.movementForm.reset({
      vehicleNo: '',
      fromPlace: '',
      fromState: 0,
      fromPincode: 0 as number,
      remainingDistance: 0,
      transDocNo: '',
      transDocDate: '',
      transMode: '1',
      extnRsnCode: '1',
      extnRemarks: '',
      transitType: '',
      consignmentStatus: 'M',
    });

    const uid = this.authStore.user()?.id;
    if (!uid || !isPlatformBrowser(this.platformId)) {
      this.loadRowError.set('Not signed in.');
      return;
    }
    try {
      const row = await this.repo.getById(uid, id);
      if (!row) {
        this.loadRowError.set('E-way bill not found.');
        return;
      }
      const built = buildExtendDraftFromEwaybillRow(row);
      if (!built) {
        this.loadRowError.set('This record has no EWB number yet.');
        return;
      }
      this.fullRow.set(row);
      this.selectedEwbNo.set(built.ewbNo);
      this.baseDraft.set(built.draft);
      this.patchFormFromDraft(built.draft);
    } catch (e) {
      this.loadRowError.set(
        e instanceof Error ? e.message : 'Failed to load e-way bill.',
      );
    }
  }

  protected resolveFromGstin(row: EwaybillDbRow | null): string | undefined {
    if (!row) {
      return undefined;
    }
    const inv = row.invoice_details as Record<string, unknown>;
    const req = row.request_payload as Record<string, unknown>;
    const g1 = typeof inv['fromGstin'] === 'string' ? inv['fromGstin'].trim() : '';
    const g2 = typeof req['fromGstin'] === 'string' ? req['fromGstin'].trim() : '';
    const g = (g1 || g2).toUpperCase();
    return gstinValidator(g) ? g : undefined;
  }

  protected fetchLatestFromGstZen(): void {
    const draft = this.baseDraft();
    const ewbNo = this.selectedEwbNo();
    const gstin = this.resolveFromGstin(this.fullRow());
    if (!draft || ewbNo == null) {
      return;
    }
    if (this.headerPrefs.includeGstinHeader() && !gstin) {
      this.fetchError.set(
        'GSTIN is required when the “Include GSTIN header” option is enabled.',
      );
      return;
    }
    this.fetchError.set(null);
    this.fetchLoading.set(true);
    this.api
      .getEwayBill({ ewbNo }, gstin)
      .pipe(finalize(() => this.fetchLoading.set(false)))
      .subscribe({
        next: (res) => {
          const merged = mergeGetEwbIntoExtendDraft(
            res as Record<string, unknown>,
            draft,
          );
          this.baseDraft.set(merged);
          this.patchFormFromDraft(merged);
        },
        error: (err: unknown) => {
          let msg =
            err instanceof EwbGstZenApiError ? err.message : 'Fetch failed.';
          if (
            (typeof msg === 'string' && msg === 'Failed to fetch') ||
            (err instanceof Error && err.message === 'Failed to fetch')
          ) {
            msg =
              'Network error (Failed to fetch). GSTZen may block browser calls (CORS), or the connection was interrupted. Try again, check VPN/ad blockers, or confirm the get-ewb URL/token in environment.';
          }
          this.fetchError.set(msg);
        },
      });
  }

  protected previewJson(): string {
    const p = this.previewPayload();
    return p ? JSON.stringify(p, null, 2) : '';
  }

  protected async copyPreviewJson(): Promise<void> {
    const text = this.previewJson();
    if (!text || !isPlatformBrowser(this.platformId)) {
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      this.copyHint.set('Copied to clipboard.');
      setTimeout(() => this.copyHint.set(null), 2500);
    } catch {
      this.copyHint.set('Copy failed — select the JSON and copy manually.');
    }
  }

  protected async submit(): Promise<void> {
    const id = this.selectedEwaybillId();
    const payload = this.previewPayload();
    if (!id || !payload) {
      return;
    }
    this.movementForm.markAllAsTouched();
    if (this.movementForm.invalid) {
      this.toast.show('error', 'Fix validation errors before submitting.', 5500);
      return;
    }
    const gstin = this.resolveFromGstin(this.fullRow());
    if (this.headerPrefs.includeGstinHeader() && !gstin) {
      this.fetchError.set(
        'GSTIN is required when the “Include GSTIN header” option is enabled.',
      );
      this.toast.show(
        'error',
        'GSTIN is required when the “Include GSTIN header” option is enabled.',
        5500,
      );
      return;
    }
    this.fetchError.set(null);
    await this.store.submitMultiVehicleMovement({
      ewaybillId: id,
      body: payload,
      fromGstin: gstin,
    });
    if (this.store.multiVehicleStatus() === 'success') {
      const raw = this.store.lastMultiVehicleApiResponse();
      const vu = pickValidUptoFromExtendRaw(raw);
      const tail = vu ? ` Valid upto: ${vu}.` : '';
      this.toast.show('success', `Multi-vehicle movement initiated.${tail}`, 6000);
    } else if (this.store.multiVehicleStatus() === 'error') {
      this.toast.show(
        'error',
        this.store.multiVehicleError() ?? 'Initiate multi-vehicle movement failed.',
        6500,
      );
    }
  }

  protected async retrySubmit(): Promise<void> {
    this.store.dismissMultiVehicleError();
    await this.submit();
  }
}
