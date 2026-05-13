import { JsonPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  type AbstractControl,
  type ValidationErrors,
  type ValidatorFn,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthToastService } from '@ramsoft-builder/auth/ui/login';
import {
  GstZenEwbApiService,
  GstZenEwbHeaderPrefsService,
  GSTZEN_EWB_HTTP_CONFIG,
  resolveEwbGetTransporterStateViewUrl,
  EwbGstZenApiError,
} from '@ramsoft-builder/ewaybills/data-access/ewb';
import { EwbInlineAlertComponent } from '@ramsoft-builder/ewaybills/ui/form';
import type { EwbTransporterStateViewResult } from '@ramsoft-builder/ewaybills/models/ewb';
import {
  ewbTransporterViewQueryDateValid,
  gstinValidator,
  normalizeEwbTransporterStateCode,
} from '@ramsoft-builder/ewaybills/utils/core';
import { finalize } from 'rxjs';

function gstinRequiredValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = (control.value ?? '').toString().trim().toUpperCase();
    if (!raw) {
      return { required: true };
    }
    return gstinValidator(raw) ? null : { gstin: true };
  };
}

function transporterStateViewDateValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = (control.value ?? '').toString().trim();
    if (!raw) {
      return { required: true };
    }
    return ewbTransporterViewQueryDateValid(raw) ? null : { dateInvalid: true };
  };
}

function stateCodeFieldValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = (control.value ?? '').toString();
    if (!raw.trim()) {
      return { required: true };
    }
    return normalizeEwbTransporterStateCode(raw) ? null : { stateCode: true };
  };
}

@Component({
  standalone: true,
  selector: 'lib-transporter-state-view-page',
  imports: [ReactiveFormsModule, RouterLink, JsonPipe, EwbInlineAlertComponent],
  templateUrl: './transporter-state-view.page.html',
  styleUrls: ['./create-ewaybill.page.scss', './get-ewaybill.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransporterStateViewPageComponent {
  private readonly api = inject(GstZenEwbApiService);
  private readonly httpCfg = inject(GSTZEN_EWB_HTTP_CONFIG);
  private readonly toast = inject(AuthToastService);
  readonly headerPrefs = inject(GstZenEwbHeaderPrefsService);

  readonly docPageUrl =
    'https://my.gstzen.in/docs/api/ewaybill-api/get-ewb-transporter-state-view/' as const;
  readonly apiEndpoint = computed(() => resolveEwbGetTransporterStateViewUrl(this.httpCfg));
  readonly includeGstinHeader = computed(() => this.headerPrefs.includeGstinHeader());

  readonly form = new FormGroup({
    date: new FormControl(this.todayYyyyMmDd(), {
      nonNullable: true,
      validators: [transporterStateViewDateValidator()],
    }),
    state_code: new FormControl('', {
      nonNullable: true,
      validators: [stateCodeFieldValidator()],
    }),
    gstin: new FormControl('', {
      nonNullable: true,
      validators: [gstinRequiredValidator()],
    }),
  });

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly result = signal<EwbTransporterStateViewResult | null>(null);

  readonly hasRows = computed(() => (this.result()?.records.length ?? 0) > 0);

  submit(): void {
    this.errorMessage.set(null);
    this.result.set(null);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.toast.show('error', 'Fix validation errors before submitting.', 5500);
      return;
    }
    const dateRaw = String(this.form.controls.date.value ?? '').trim();
    const gstinRaw = String(this.form.controls.gstin.value ?? '')
      .trim()
      .toUpperCase();
    const stateNorm = normalizeEwbTransporterStateCode(
      String(this.form.controls.state_code.value ?? ''),
    );
    if (!stateNorm) {
      this.toast.show('error', 'Enter a valid GST state code (1–38).', 5000);
      return;
    }
    if (this.includeGstinHeader() && !gstinRaw) {
      const msg =
        'GSTIN is required when the “Include GSTIN header” option is enabled for e-way API calls (top bar).';
      this.errorMessage.set(msg);
      this.toast.show('error', msg, 5500);
      return;
    }
    this.loading.set(true);
    this.api
      .getEwbTransporterStateView(
        { date: dateRaw, state_code: stateNorm, gstin: gstinRaw },
        gstinRaw,
      )
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => {
          this.result.set(res);
          const n = res.records.length;
          if (n > 0) {
            this.toast.show('success', `Loaded ${n} e-way bill row(s).`, 5000);
          } else {
            this.toast.show(
              'info',
              res.notice ?? 'No rows returned for this date, state, and GSTIN.',
              6000,
            );
          }
        },
        error: (err: unknown) => {
          const msg =
            err instanceof EwbGstZenApiError ? err.message : 'Request failed.';
          this.errorMessage.set(msg);
          this.toast.show('error', msg, 6500);
        },
      });
  }

  protected retrySubmit(): void {
    this.errorMessage.set(null);
    this.submit();
  }

  protected dismissError(): void {
    this.errorMessage.set(null);
  }

  private todayYyyyMmDd(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
