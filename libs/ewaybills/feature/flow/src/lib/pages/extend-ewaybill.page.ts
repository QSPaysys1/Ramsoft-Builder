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
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
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
  EwbExtensionReasonCode,
  EwbTransModeCode,
} from '@ramsoft-builder/ewaybills/models/ewb';
import { EwbInlineAlertComponent } from '@ramsoft-builder/ewaybills/ui/form';
import { EwbSavedBillsTableComponent } from '@ramsoft-builder/ewaybills/ui/table';
import {
  buildExtendDraftFromEwaybillRow,
  filterEwaybillListByTransport,
  gstinValidator,
  mapFormValuesToEwbExtendRequest,
  mergeGetEwbIntoExtendDraft,
  normalizeEwbTransModeForApi,
  pincodeValidator,
  transDocDateToDateInputValue,
  type EwbExtendDraftFormValues,
} from '@ramsoft-builder/ewaybills/utils/core';
import { finalize, startWith } from 'rxjs';

const TRANS_MODES: ReadonlyArray<{ code: EwbTransModeCode; label: string }> = [
  { code: '1', label: 'Road' },
  { code: '2', label: 'Rail' },
  { code: '3', label: 'Air' },
  { code: '4', label: 'Ship' },
];

/** NIC/GSTZen extension reason codes (`extnRsnCode`). */
const EXTN_REASONS: ReadonlyArray<{ code: EwbExtensionReasonCode; label: string }> = [
  { code: 1, label: 'Natural calamity' },
  { code: 2, label: 'Law and order situation' },
  { code: 3, label: 'Transshipment' },
  { code: 4, label: 'Accident' },
  { code: 5, label: 'Others' },
];

const CONSIGNMENT_STATUS: ReadonlyArray<{ code: 'M' | 'T'; label: string }> = [
  { code: 'M', label: 'In movement' },
  { code: 'T', label: 'In transit' },
];

function pincodeDigitsValidator(control: AbstractControl): ValidationErrors | null {
  const v = control.value;
  if (v === null || v === undefined || v === '') {
    return { required: true };
  }
  return pincodeValidator(String(v)) ? null : { pincode: true };
}

function pickValidUptoFromExtendRaw(raw: Record<string, unknown> | null): string {
  if (!raw) {
    return '';
  }
  for (const k of ['ValidUpto', 'validUpto', 'ExtnValidUpto', 'extnValidUpto']) {
    const v = raw[k];
    if (typeof v === 'string' && v.trim()) {
      return v.trim();
    }
  }
  return '';
}

@Component({
  standalone: true,
  selector: 'lib-extend-ewaybill-page',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    JsonPipe,
    EwbInlineAlertComponent,
    EwbSavedBillsTableComponent,
  ],
  templateUrl: './extend-ewaybill.page.html',
  styleUrls: ['./create-ewaybill.page.scss', './update-part-b.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExtendEwaybillPageComponent {
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

  protected readonly transModes = TRANS_MODES;
  protected readonly extnReasons = EXTN_REASONS;
  protected readonly consignmentStatuses = CONSIGNMENT_STATUS;

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

  protected readonly extendForm = this.fb.nonNullable.group({
    vehicleNo: this.fb.nonNullable.control<string>('', [
      Validators.required,
      Validators.maxLength(20),
    ]),
    fromPlace: this.fb.nonNullable.control<string>('', [
      Validators.required,
      Validators.maxLength(100),
    ]),
    fromState: this.fb.nonNullable.control<number>(0, [
      Validators.required,
      Validators.min(1),
      Validators.max(99),
    ]),
    fromPincode: this.fb.nonNullable.control<number>(0 as number, [
      Validators.required,
      pincodeDigitsValidator,
    ]),
    remainingDistance: this.fb.nonNullable.control<number>(0, [
      Validators.required,
      Validators.min(1),
      Validators.max(99999),
    ]),
    transDocNo: this.fb.nonNullable.control<string>('', [Validators.maxLength(50)]),
    transDocDate: this.fb.nonNullable.control<string>('', Validators.required),
    transMode: this.fb.nonNullable.control<string>('1', Validators.required),
    extnRsnCode: this.fb.nonNullable.control<string>('1', Validators.required),
    extnRemarks: this.fb.nonNullable.control<string>('', [Validators.maxLength(100)]),
    transitType: this.fb.nonNullable.control<string>('', [Validators.maxLength(30)]),
    consignmentStatus: this.fb.nonNullable.control<'M' | 'T'>('M', Validators.required),
  });

  private readonly formTick = toSignal(this.extendForm.valueChanges.pipe(startWith(null)), {
    initialValue: null,
  });

  protected readonly previewPayload = computed((): EwbExtendRequest | null => {
    void this.formTick();
    const ewbNo = this.selectedEwbNo();
    const base = this.baseDraft();
    if (ewbNo == null || !base) {
      return null;
    }
    const v = this.extendForm.getRawValue();
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
    this.extendForm.patchValue({
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
    this.store.resetExtendUi();
    this.store.dismissExtendError();
    this.selectedEwaybillId.set(id);
    this.selectedEwbNo.set(null);
    this.loadRowError.set(null);
    this.fullRow.set(null);
    this.baseDraft.set(null);
    this.extendForm.reset({
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
    this.extendForm.markAllAsTouched();
    if (this.extendForm.invalid) {
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
    await this.store.submitExtendUpdate({
      ewaybillId: id,
      body: payload,
      fromGstin: gstin,
    });
    if (this.store.extendStatus() === 'success') {
      const raw = this.store.lastExtendApiResponse();
      const vu = pickValidUptoFromExtendRaw(raw);
      const tail = vu ? ` Valid upto: ${vu}.` : '';
      this.toast.show('success', `E-way bill extended.${tail}`, 6000);
    } else if (this.store.extendStatus() === 'error') {
      this.toast.show(
        'error',
        this.store.extendError() ?? 'Extend e-way bill failed.',
        6500,
      );
    }
  }

  protected async retrySubmit(): Promise<void> {
    this.store.dismissExtendError();
    await this.submit();
  }
}
