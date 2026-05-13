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
  filterEwaybillListByTransport,
  gstinValidator,
  normalizeEwbNoTo12Digits,
} from '@ramsoft-builder/ewaybills/utils/core';

function ewbNo12ControlValidator(control: AbstractControl): ValidationErrors | null {
  const v = normalizeEwbNoTo12Digits(control.value);
  return v ? null : { ewbNo12: true };
}

function transporterGstinControlValidator(
  control: AbstractControl,
): ValidationErrors | null {
  return gstinValidator(control.value) ? null : { gstin: true };
}

function pickTransporterIdFromRow(row: EwaybillDbRow): string {
  const tr = row.transporter_details as Record<string, unknown>;
  const req = row.request_payload as Record<string, unknown>;
  const a =
    typeof tr['transporterId'] === 'string' ? tr['transporterId'].trim() : '';
  const b =
    typeof req['transporterId'] === 'string' ? req['transporterId'].trim() : '';
  return (a || b).toUpperCase();
}

@Component({
  standalone: true,
  selector: 'lib-update-transporter-page',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    JsonPipe,
    EwbInlineAlertComponent,
    EwbSavedBillsTableComponent,
  ],
  templateUrl: './update-transporter.page.html',
  styleUrls: ['./create-ewaybill.page.scss', './update-part-b.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpdateTransporterPageComponent {
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

  protected readonly form = this.fb.nonNullable.group({
    ewbNo: this.fb.nonNullable.control<string>('', [
      Validators.required,
      ewbNo12ControlValidator,
    ]),
    transporterId: this.fb.nonNullable.control<string>('', [
      Validators.required,
      transporterGstinControlValidator,
    ]),
  });

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
    this.store.resetTransporterUi();
    this.store.dismissTransporterError();
    this.selectedEwaybillId.set(id);
    this.loadRowError.set(null);
    this.fullRow.set(null);
    this.form.reset({ ewbNo: '', transporterId: '' });
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
      const ewb = normalizeEwbNoTo12Digits(row.ewb_number);
      if (!ewb) {
        this.loadRowError.set('This record has no valid 12-digit EWB number yet.');
        return;
      }
      this.fullRow.set(row);
      const trId = pickTransporterIdFromRow(row);
      this.form.patchValue({
        ewbNo: ewb,
        transporterId: trId,
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
    const ewb = normalizeEwbNoTo12Digits(this.form.getRawValue().ewbNo);
    const tr = String(this.form.getRawValue().transporterId ?? '')
      .trim()
      .toUpperCase();
    if (!ewb || !gstinValidator(tr)) {
      return '';
    }
    return JSON.stringify({ ewbNo: ewb, transporterId: tr }, null, 2);
  }

  protected async submit(): Promise<void> {
    const id = this.selectedEwaybillId();
    if (!id) {
      return;
    }
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.toast.show('error', 'Fix ewbNo (12 digits) and transporter GSTIN before submitting.', 5000);
      return;
    }
    const { ewbNo, transporterId } = this.form.getRawValue();
    const ewbNorm = normalizeEwbNoTo12Digits(ewbNo);
    const trNorm = String(transporterId).trim().toUpperCase();
    if (!ewbNorm || !gstinValidator(trNorm)) {
      this.toast.show('error', 'Invalid ewbNo or transporter GSTIN.', 5000);
      return;
    }
    const gstin = this.resolveFromGstin(this.fullRow());
    if (this.headerPrefs.includeGstinHeader() && !gstin) {
      this.toast.show(
        'error',
        'GSTIN is required when the “Include GSTIN header” option is enabled.',
        5000,
      );
      return;
    }
    await this.store.submitTransporterUpdate({
      ewaybillId: id,
      body: { ewbNo: ewbNorm, transporterId: trNorm },
      fromGstin: gstin,
    });
    if (this.store.transporterStatus() === 'success') {
      const raw = this.store.lastTransporterApiResponse();
      const msg =
        typeof raw?.['message'] === 'string' && String(raw['message']).trim()
          ? String(raw['message']).trim()
          : 'Transporter updated successfully.';
      this.toast.show('success', msg, 5000);
    } else if (this.store.transporterStatus() === 'error') {
      this.toast.show(
        'error',
        this.store.transporterError() ?? 'Update transporter failed.',
        6000,
      );
    }
  }

  protected async retrySubmit(): Promise<void> {
    this.store.dismissTransporterError();
    await this.submit();
  }
}
