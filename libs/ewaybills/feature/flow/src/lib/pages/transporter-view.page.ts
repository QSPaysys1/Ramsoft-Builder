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
import {
  GstZenEwbApiService,
  GstZenEwbHeaderPrefsService,
  GSTZEN_EWB_HTTP_CONFIG,
  resolveEwbGetTransporterViewUrl,
  EwbGstZenApiError,
} from '@ramsoft-builder/ewaybills/data-access/ewb';
import { EwbInlineAlertComponent } from '@ramsoft-builder/ewaybills/ui/form';
import type { EwbTransporterViewResult } from '@ramsoft-builder/ewaybills/models/ewb';
import {
  ewbTransporterViewQueryDateValid,
  gstinValidator,
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

function transporterViewDateValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = (control.value ?? '').toString().trim();
    if (!raw) {
      return { required: true };
    }
    return ewbTransporterViewQueryDateValid(raw) ? null : { dateInvalid: true };
  };
}

@Component({
  standalone: true,
  selector: 'lib-transporter-view-page',
  imports: [ReactiveFormsModule, RouterLink, JsonPipe, EwbInlineAlertComponent],
  templateUrl: './transporter-view.page.html',
  styleUrls: ['./create-ewaybill.page.scss', './get-ewaybill.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransporterViewPageComponent {
  private readonly api = inject(GstZenEwbApiService);
  private readonly httpCfg = inject(GSTZEN_EWB_HTTP_CONFIG);
  readonly headerPrefs = inject(GstZenEwbHeaderPrefsService);

  readonly docPageUrl =
    'https://my.gstzen.in/docs/api/ewaybill-api/get-ewb-transporter-view/' as const;
  readonly apiEndpoint = computed(() => resolveEwbGetTransporterViewUrl(this.httpCfg));
  readonly includeGstinHeader = computed(() => this.headerPrefs.includeGstinHeader());

  readonly form = new FormGroup({
    date: new FormControl(this.todayYyyyMmDd(), {
      nonNullable: true,
      validators: [transporterViewDateValidator()],
    }),
    gstin: new FormControl('', {
      nonNullable: true,
      validators: [gstinRequiredValidator()],
    }),
  });

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly result = signal<EwbTransporterViewResult | null>(null);

  readonly hasRows = computed(() => (this.result()?.records.length ?? 0) > 0);

  submit(): void {
    this.errorMessage.set(null);
    this.result.set(null);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const dateRaw = String(this.form.controls.date.value ?? '').trim();
    const gstinRaw = String(this.form.controls.gstin.value ?? '')
      .trim()
      .toUpperCase();
    if (this.includeGstinHeader() && !gstinRaw) {
      this.errorMessage.set(
        'GSTIN is required when the “Include GSTIN header” option is enabled for e-way API calls (top bar).',
      );
      return;
    }
    this.loading.set(true);
    this.api
      .getEwbTransporterView({ date: dateRaw, gstin: gstinRaw }, gstinRaw)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => this.result.set(res),
        error: (err: unknown) => {
          const msg =
            err instanceof EwbGstZenApiError ? err.message : 'Request failed.';
          this.errorMessage.set(msg);
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
