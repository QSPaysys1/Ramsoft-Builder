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
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
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
  EwbTransModeCode,
  EwbUpdatePartBRequest,
} from '@ramsoft-builder/ewaybills/models/ewb';
import { EwbInlineAlertComponent } from '@ramsoft-builder/ewaybills/ui/form';
import { EwbSavedBillsTableComponent } from '@ramsoft-builder/ewaybills/ui/table';
import {
  buildUpdatePartBRequestFromEwaybillRow,
  EWB_PARTB_UI_REASONS,
  filterEwaybillListByTransport,
  gstinValidator,
  mergeGetEwbResponseIntoUpdatePartBRequest,
  normalizeDocDateForApi,
  normalizeEwbTransModeForApi,
  transDocDateToDateInputValue,
} from '@ramsoft-builder/ewaybills/utils/core';
import { finalize, startWith } from 'rxjs';

const PARTB_TRANS_MODES: ReadonlyArray<{ code: EwbTransModeCode; label: string }> = [
  { code: '1', label: 'Road' },
  { code: '2', label: 'Rail' },
  { code: '3', label: 'Air' },
  { code: '4', label: 'Ship' },
];

@Component({
  standalone: true,
  selector: 'lib-update-part-b-page',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    JsonPipe,
    EwbInlineAlertComponent,
    EwbSavedBillsTableComponent,
  ],
  templateUrl: './update-part-b.page.html',
  styleUrls: ['./create-ewaybill.page.scss', './update-part-b.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpdatePartBPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly authStore = inject(AuthStore);
  private readonly repo = inject(EwaybillRepository);
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly store = inject(EwaybillStore);
  private readonly api = inject(GstZenEwbApiService);
  protected readonly headerPrefs = inject(GstZenEwbHeaderPrefsService);

  protected readonly partBReasons = EWB_PARTB_UI_REASONS;
  protected readonly transModes = PARTB_TRANS_MODES;

  protected readonly transportFilter = signal<EwaybillSavedListTransportFilter>('all');
  protected readonly selectedEwaybillId = signal<string | null>(null);
  protected readonly fullRow = signal<EwaybillDbRow | null>(null);
  protected readonly loadRowError = signal<string | null>(null);
  protected readonly baseRequest = signal<EwbUpdatePartBRequest | null>(null);

  protected readonly filteredRows = computed(() =>
    filterEwaybillListByTransport(this.store.list(), this.transportFilter()),
  );

  protected readonly listEmptyHint = computed(() =>
    this.store.list().length === 0
      ? 'No saved e-way bills yet.'
      : 'No e-way bills match this filter.',
  );

  protected readonly partBEditableForm = this.fb.nonNullable.group({
    reasonCode: this.fb.nonNullable.control<string>('1', Validators.required),
    reasonRem: this.fb.nonNullable.control<string>('', [Validators.maxLength(100)]),
    vehicleNo: this.fb.nonNullable.control<string>('', [
      Validators.required,
      Validators.maxLength(20),
    ]),
    transDocNo: this.fb.nonNullable.control<string>('', [Validators.maxLength(20)]),
    transDocDate: this.fb.nonNullable.control<string>('', Validators.required),
    transMode: this.fb.nonNullable.control<string>('1', Validators.required),
  });

  private readonly formTick = toSignal(
    this.partBEditableForm.valueChanges.pipe(startWith(null)),
    { initialValue: null },
  );

  protected readonly previewPayload = computed((): EwbUpdatePartBRequest | null => {
    void this.formTick();
    const base = this.baseRequest();
    if (!base) {
      return null;
    }
    const v = this.partBEditableForm.getRawValue();
    return {
      ...base,
      reasonCode: String(v.reasonCode),
      reasonRem: String(v.reasonRem ?? '').trim(),
      vehicleNo: String(v.vehicleNo ?? '').trim().toUpperCase(),
      transDocNo: String(v.transDocNo ?? '').trim(),
      transDocDate: normalizeDocDateForApi(v.transDocDate),
      transMode: normalizeEwbTransModeForApi(v.transMode),
    };
  });

  protected readonly fetchLoading = signal(false);
  protected readonly fetchError = signal<string | null>(null);
  protected readonly copyHint = signal<string | null>(null);

  constructor() {
    void this.store.loadList();
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((qp) => {
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

  private async selectByEwaybillId(id: string): Promise<void> {
    this.store.resetPartBUi();
    this.store.dismissPartBError();
    this.selectedEwaybillId.set(id);
    this.loadRowError.set(null);
    this.fullRow.set(null);
    this.baseRequest.set(null);
    this.partBEditableForm.reset({
      reasonCode: '1',
      reasonRem: '',
      vehicleNo: '',
      transDocNo: '',
      transDocDate: '',
      transMode: '1',
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
      const draft = buildUpdatePartBRequestFromEwaybillRow(row);
      if (!draft) {
        this.loadRowError.set('This record has no EWB number yet.');
        return;
      }
      this.fullRow.set(row);
      this.baseRequest.set(draft);
      this.partBEditableForm.patchValue({
        reasonCode: draft.reasonCode,
        reasonRem: draft.reasonRem,
        vehicleNo: draft.vehicleNo,
        transDocNo: draft.transDocNo,
        transDocDate: transDocDateToDateInputValue(draft.transDocDate),
        transMode: normalizeEwbTransModeForApi(draft.transMode),
      });
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
    const base = this.baseRequest();
    const gstin = this.resolveFromGstin(this.fullRow());
    if (!base) {
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
      .getEwayBill(
        { ewbNo: typeof base.ewbNo === 'number' ? base.ewbNo : Number(String(base.ewbNo)) },
        gstin,
      )
      .pipe(finalize(() => this.fetchLoading.set(false)))
      .subscribe({
        next: (res) => {
          const merged = mergeGetEwbResponseIntoUpdatePartBRequest(
            res as Record<string, unknown>,
            base,
          );
          this.baseRequest.set(merged);
          this.partBEditableForm.patchValue({
            vehicleNo: merged.vehicleNo,
            transDocNo: merged.transDocNo,
            transDocDate: transDocDateToDateInputValue(merged.transDocDate),
            transMode: normalizeEwbTransModeForApi(merged.transMode),
          });
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
    this.partBEditableForm.markAllAsTouched();
    if (this.partBEditableForm.invalid) {
      return;
    }
    const gstin = this.resolveFromGstin(this.fullRow());
    if (this.headerPrefs.includeGstinHeader() && !gstin) {
      this.fetchError.set(
        'GSTIN is required when the “Include GSTIN header” option is enabled.',
      );
      return;
    }
    this.fetchError.set(null);
    await this.store.submitPartBUpdate({
      ewaybillId: id,
      body: payload,
      fromGstin: gstin,
    });
  }

  protected async retrySubmit(): Promise<void> {
    this.store.dismissPartBError();
    await this.submit();
  }
}
