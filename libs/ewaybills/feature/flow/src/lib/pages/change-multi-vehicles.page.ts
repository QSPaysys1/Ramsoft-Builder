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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthToastService } from '@ramsoft-builder/auth/ui/login';
import { AuthStore } from '@ramsoft-builder/auth/data-access/auth';
import {
  EwaybillRepository,
  EwaybillStore,
  GstZenEwbHeaderPrefsService,
} from '@ramsoft-builder/ewaybills/data-access/ewb';
import type {
  EwaybillDbRow,
  EwaybillListView,
  EwaybillSavedListTransportFilter,
} from '@ramsoft-builder/ewaybills/models/ewb';
import { EwbInlineAlertComponent } from '@ramsoft-builder/ewaybills/ui/form';
import { EwbSavedBillsTableComponent } from '@ramsoft-builder/ewaybills/ui/table';
import {
  buildExtendDraftFromEwaybillRow,
  EWB_PARTB_UI_REASONS,
  filterEwaybillListByTransport,
  gstinValidator,
  normalizeEwbNoTo12Digits,
} from '@ramsoft-builder/ewaybills/utils/core';
import {
  buildChangeMultiVehiclesFormGroup,
  changeMultiVehiclesFormToApiPayload,
} from '../ewb-change-multi-vehicles.form';

const EMPTY_CHANGE_MV_FORM = {
  ewbNo: '',
  groupNo: '',
  oldvehicleNo: '',
  newVehicleNo: '',
  oldTranNo: '',
  newTranNo: '',
  fromPlace: '',
  fromState: 1,
  reasonCode: '1' as const,
  reasonRem: '',
} as const;

@Component({
  standalone: true,
  selector: 'lib-change-multi-vehicles-page',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    JsonPipe,
    EwbInlineAlertComponent,
    EwbSavedBillsTableComponent,
  ],
  templateUrl: './change-multi-vehicles.page.html',
  styleUrls: ['./create-ewaybill.page.scss', './update-part-b.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangeMultiVehiclesPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly authStore = inject(AuthStore);
  private readonly repo = inject(EwaybillRepository);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly toast = inject(AuthToastService);
  protected readonly store = inject(EwaybillStore);
  protected readonly headerPrefs = inject(GstZenEwbHeaderPrefsService);

  protected readonly transportFilter = signal<EwaybillSavedListTransportFilter>('all');
  protected readonly selectedEwaybillId = signal<string | null>(null);
  protected readonly fullRow = signal<EwaybillDbRow | null>(null);
  protected readonly loadRowError = signal<string | null>(null);

  protected readonly filteredRows = computed(() =>
    filterEwaybillListByTransport(this.store.list(), this.transportFilter()),
  );

  protected readonly listEmptyHint = computed(() =>
    this.store.list().length === 0
      ? 'No saved e-way bills yet.'
      : 'No e-way bills match this filter.',
  );

  protected readonly reasonOptions = EWB_PARTB_UI_REASONS;

  protected readonly form = buildChangeMultiVehiclesFormGroup(this.fb);

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
    this.store.resetChangeMultiVehiclesUi();
    this.store.dismissChangeMultiVehiclesError();
    this.selectedEwaybillId.set(id);
    this.loadRowError.set(null);
    this.fullRow.set(null);
    this.form.reset({ ...EMPTY_CHANGE_MV_FORM });
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
        this.loadRowError.set('This record has no valid 12-digit EWB number yet.');
        return;
      }
      const fs =
        built.draft.fromState >= 1 && built.draft.fromState <= 99
          ? built.draft.fromState
          : 1;
      this.fullRow.set(row);
      this.form.patchValue({
        ewbNo: String(built.ewbNo),
        groupNo: '',
        oldvehicleNo: built.draft.vehicleNo,
        newVehicleNo: '',
        oldTranNo: built.draft.transDocNo,
        newTranNo: '',
        fromPlace: built.draft.fromPlace,
        fromState: fs,
        reasonCode: '1',
        reasonRem: '',
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

  protected previewJson(): string {
    const payload = changeMultiVehiclesFormToApiPayload(this.form.getRawValue());
    if (!payload) {
      return '';
    }
    return JSON.stringify(payload, null, 2);
  }

  private resetFormKeepEwb(): void {
    const ewb = normalizeEwbNoTo12Digits(this.form.getRawValue().ewbNo);
    this.form.reset({ ...EMPTY_CHANGE_MV_FORM });
    if (ewb) {
      this.form.patchValue({ ewbNo: ewb });
    }
  }

  protected async submit(): Promise<void> {
    const id = this.selectedEwaybillId();
    if (!id) {
      return;
    }
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.toast.show('error', 'Fix validation errors before submitting.', 5500);
      return;
    }
    const payload = changeMultiVehiclesFormToApiPayload(this.form.getRawValue());
    if (!payload) {
      this.toast.show('error', 'Invalid form values for API payload.', 5500);
      return;
    }
    const gstin = this.resolveFromGstin(this.fullRow());
    if (this.headerPrefs.includeGstinHeader() && !gstin) {
      this.toast.show(
        'error',
        'GSTIN is required when the “Include GSTIN header” option is enabled.',
        5500,
      );
      return;
    }
    await this.store.submitChangeMultiVehicles({
      ewaybillId: id,
      body: payload,
      fromGstin: gstin,
    });
    if (this.store.changeMultiVehiclesStatus() === 'success') {
      this.toast.show('success', 'Change multi vehicles request completed successfully.', 6000);
      this.resetFormKeepEwb();
    } else if (this.store.changeMultiVehiclesStatus() === 'error') {
      this.toast.show(
        'error',
        this.store.changeMultiVehiclesError() ?? 'Change multi vehicles failed.',
        6500,
      );
    }
  }

  protected async retrySubmit(): Promise<void> {
    this.store.dismissChangeMultiVehiclesError();
    await this.submit();
  }
}
