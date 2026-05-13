import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { AuthToastService } from '@ramsoft-builder/auth/ui/login';
import { AuthStore } from '@ramsoft-builder/auth/data-access/auth';
import {
  EwaybillRepository,
  EwaybillStore,
  GstZenEwbHeaderPrefsService,
  type EwaybillCancelInput,
} from '@ramsoft-builder/ewaybills/data-access/ewb';
import type {
  EwaybillDbRow,
  EwaybillListView,
  EwaybillSavedListTransportFilter,
  EwbCancelReasonCode,
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
  normalizeEwbTransModeForApi,
  transDocDateToDateInputValue,
  type EwbExtendDraftFormValues,
} from '@ramsoft-builder/ewaybills/utils/core';
import { startWith } from 'rxjs';
import { buildEwbExtendMovementFormGroup } from '../ewb-extend-movement.form';

/** NIC `cancelRsnCode` reference values. */
const CANCEL_REASONS: ReadonlyArray<{ code: EwbCancelReasonCode; label: string }> = [
  { code: 1, label: 'Duplicate' },
  { code: 2, label: 'Order cancelled' },
  { code: 3, label: 'Data entry mistake' },
  { code: 4, label: 'Others' },
];

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
  selector: 'lib-ewb-list-page',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    EwbInlineAlertComponent,
    EwbSavedBillsTableComponent,
  ],
  templateUrl: './ewaybills-list.page.html',
  styleUrl: './ewaybills-list.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EwaybillsListPageComponent {
  protected readonly store = inject(EwaybillStore);
  private readonly fb = inject(FormBuilder);
  private readonly authStore = inject(AuthStore);
  private readonly repo = inject(EwaybillRepository);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly toast = inject(AuthToastService);
  private readonly headerPrefs = inject(GstZenEwbHeaderPrefsService);

  protected readonly cancelReasons = CANCEL_REASONS;
  protected readonly cancelTarget = signal<EwaybillListView | null>(null);
  protected readonly cancelSuccessMessage = signal<string | null>(null);

  protected readonly transportFilter = signal<EwaybillSavedListTransportFilter>('all');
  protected readonly filteredRows = computed(() =>
    filterEwaybillListByTransport(this.store.list(), this.transportFilter()),
  );
  protected readonly listEmptyHint = computed(() =>
    this.store.list().length === 0
      ? 'No saved e-way bills yet.'
      : 'No e-way bills match this filter.',
  );

  protected readonly cancelForm = this.fb.nonNullable.group({
    cancelRsnCode: this.fb.nonNullable.control<EwbCancelReasonCode>(
      3 as EwbCancelReasonCode,
      Validators.required,
    ),
    cancelRmrk: this.fb.nonNullable.control<string>('', [Validators.maxLength(50)]),
  });

  protected readonly cancelInFlight = computed(
    () => this.store.cancelStatus() === 'loading',
  );

  protected readonly transModes = EWB_EXTEND_UI_TRANS_MODES;
  protected readonly extnReasons = EWB_EXTEND_UI_EXTN_REASONS;
  protected readonly consignmentStatuses = EWB_EXTEND_UI_CONSIGNMENT_STATUS;

  protected readonly multiVehicleTarget = signal<EwaybillListView | null>(null);
  protected readonly multiVehicleRow = signal<EwaybillDbRow | null>(null);
  protected readonly multiVehicleEwbNo = signal<number | null>(null);
  protected readonly multiVehicleBaseDraft = signal<EwbExtendDraftFormValues | null>(null);
  protected readonly multiVehicleLoadError = signal<string | null>(null);
  protected readonly multiVehicleFormBusy = signal(false);

  protected readonly multiVehicleForm = buildEwbExtendMovementFormGroup(this.fb);

  private readonly multiVehicleFormTick = toSignal(
    this.multiVehicleForm.valueChanges.pipe(startWith(null)),
    { initialValue: null },
  );

  protected readonly multiVehiclePreview = computed((): EwbExtendRequest | null => {
    void this.multiVehicleFormTick();
    const ewbNo = this.multiVehicleEwbNo();
    const base = this.multiVehicleBaseDraft();
    if (ewbNo == null || !base) {
      return null;
    }
    const v = this.multiVehicleForm.getRawValue();
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

  protected readonly multiVehicleInFlight = computed(
    () => this.store.multiVehicleStatus() === 'loading',
  );

  constructor() {
    void this.store.loadList();
  }

  protected onTransportFilterChange(f: EwaybillSavedListTransportFilter): void {
    this.transportFilter.set(f);
  }

  protected canCancel(row: EwaybillListView): boolean {
    return row.status === 'generated' && !!row.ewbNumber;
  }

  protected openCancelDialog(row: EwaybillListView): void {
    if (!this.canCancel(row)) {
      return;
    }
    this.cancelSuccessMessage.set(null);
    this.store.dismissCancelError();
    this.cancelForm.reset({ cancelRsnCode: 3 as EwbCancelReasonCode, cancelRmrk: '' });
    this.cancelTarget.set(row);
  }

  protected closeCancelDialog(): void {
    if (this.cancelInFlight()) {
      return;
    }
    this.cancelTarget.set(null);
    this.store.dismissCancelError();
  }

  protected async submitCancel(): Promise<void> {
    const target = this.cancelTarget();
    if (!target?.ewbNumber || this.cancelInFlight()) {
      return;
    }
    this.cancelForm.markAllAsTouched();
    if (this.cancelForm.invalid) {
      return;
    }
    const { cancelRsnCode, cancelRmrk } = this.cancelForm.getRawValue();
    const input: EwaybillCancelInput = {
      id: target.id,
      ewbNo: target.ewbNumber,
      cancelRsnCode,
      cancelRmrk: cancelRmrk.trim() || undefined,
      fromGstin: target.fromGstin ?? undefined,
    };
    await this.store.cancelEwaybill(input);
    if (this.store.cancelStatus() === 'success') {
      this.cancelSuccessMessage.set(
        `E-way bill ${target.ewbNumber} cancelled successfully.`,
      );
      this.cancelTarget.set(null);
    }
  }

  protected openMultiVehicleDialog(row: EwaybillListView): void {
    void this.prepareMultiVehicleDialog(row);
  }

  protected closeMultiVehicleDialog(): void {
    if (this.multiVehicleInFlight()) {
      return;
    }
    this.multiVehicleTarget.set(null);
    this.multiVehicleRow.set(null);
    this.multiVehicleEwbNo.set(null);
    this.multiVehicleBaseDraft.set(null);
    this.multiVehicleLoadError.set(null);
    this.store.dismissMultiVehicleError();
    this.store.resetMultiVehicleUi();
    this.multiVehicleForm.reset({
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
  }

  private async prepareMultiVehicleDialog(row: EwaybillListView): Promise<void> {
    this.store.resetMultiVehicleUi();
    this.store.dismissMultiVehicleError();
    this.multiVehicleTarget.set(row);
    this.multiVehicleRow.set(null);
    this.multiVehicleEwbNo.set(null);
    this.multiVehicleBaseDraft.set(null);
    this.multiVehicleLoadError.set(null);
    this.multiVehicleFormBusy.set(true);
    this.multiVehicleForm.reset({
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
      this.multiVehicleLoadError.set('Not signed in.');
      this.multiVehicleFormBusy.set(false);
      return;
    }
    try {
      const full = await this.repo.getById(uid, row.id);
      if (!full) {
        this.multiVehicleLoadError.set('E-way bill not found.');
        return;
      }
      const built = buildExtendDraftFromEwaybillRow(full);
      if (!built) {
        this.multiVehicleLoadError.set('This record has no EWB number yet.');
        return;
      }
      this.multiVehicleRow.set(full);
      this.multiVehicleEwbNo.set(built.ewbNo);
      this.multiVehicleBaseDraft.set(built.draft);
      this.multiVehicleForm.patchValue({
        vehicleNo: built.draft.vehicleNo,
        fromPlace: built.draft.fromPlace,
        fromState: built.draft.fromState || 0,
        fromPincode: built.draft.fromPincode || (0 as number),
        remainingDistance: built.draft.remainingDistance || 0,
        transDocNo: built.draft.transDocNo,
        transDocDate: transDocDateToDateInputValue(built.draft.transDocDate),
        transMode: normalizeEwbTransModeForApi(built.draft.transMode),
        extnRsnCode: String(built.draft.extnRsnCode ?? '1'),
        extnRemarks: built.draft.extnRemarks,
        transitType: built.draft.transitType,
        consignmentStatus: built.draft.consignmentStatus === 'T' ? 'T' : 'M',
      });
    } catch (e) {
      this.multiVehicleLoadError.set(
        e instanceof Error ? e.message : 'Failed to load e-way bill.',
      );
    } finally {
      this.multiVehicleFormBusy.set(false);
    }
  }

  private resolveFromGstinForMultiVehicle(): string | undefined {
    const row = this.multiVehicleRow();
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

  protected async submitMultiVehicle(): Promise<void> {
    const target = this.multiVehicleTarget();
    const payload = this.multiVehiclePreview();
    if (!target || !payload || this.multiVehicleInFlight()) {
      return;
    }
    this.multiVehicleForm.markAllAsTouched();
    if (this.multiVehicleForm.invalid) {
      this.toast.show('error', 'Fix validation errors before submitting.', 5500);
      return;
    }
    const gstin = this.resolveFromGstinForMultiVehicle();
    if (this.headerPrefs.includeGstinHeader() && !gstin) {
      this.toast.show(
        'error',
        'GSTIN is required when the “Include GSTIN header” option is enabled.',
        5500,
      );
      return;
    }
    await this.store.submitMultiVehicleMovement({
      ewaybillId: target.id,
      body: payload,
      fromGstin: gstin,
    });
    if (this.store.multiVehicleStatus() === 'success') {
      const raw = this.store.lastMultiVehicleApiResponse();
      const vu = pickValidUptoFromExtendRaw(raw);
      const tail = vu ? ` Valid upto: ${vu}.` : '';
      this.toast.show('success', `Multi-vehicle movement initiated.${tail}`, 6000);
      this.closeMultiVehicleDialog();
    } else if (this.store.multiVehicleStatus() === 'error') {
      this.toast.show(
        'error',
        this.store.multiVehicleError() ?? 'Initiate multi-vehicle movement failed.',
        6500,
      );
    }
  }
}
