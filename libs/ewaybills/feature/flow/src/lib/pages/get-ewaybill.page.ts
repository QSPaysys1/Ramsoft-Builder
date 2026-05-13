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
  resolveEwbGetUrl,
  EwbGstZenApiError,
} from '@ramsoft-builder/ewaybills/data-access/ewb';
import { EwbInlineAlertComponent } from '@ramsoft-builder/ewaybills/ui/form';
import { gstinValidator } from '@ramsoft-builder/ewaybills/utils/core';
import { finalize } from 'rxjs';

const EWB_NO_DIGITS = /^\d{12}$/;

function ewbNoValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = (control.value ?? '').toString().replace(/\s+/g, '');
    if (!raw) {
      return { required: true };
    }
    return EWB_NO_DIGITS.test(raw) ? null : { ewbNo: true };
  };
}

function optionalGstinValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = (control.value ?? '').toString().trim();
    if (!raw) {
      return null;
    }
    return gstinValidator(raw) ? null : { gstin: true };
  };
}

@Component({
  standalone: true,
  selector: 'lib-get-ewaybill-page',
  imports: [ReactiveFormsModule, RouterLink, JsonPipe, EwbInlineAlertComponent],
  templateUrl: './get-ewaybill.page.html',
  styleUrls: ['./create-ewaybill.page.scss', './get-ewaybill.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GetEwaybillPageComponent {
  private readonly api = inject(GstZenEwbApiService);
  private readonly httpCfg = inject(GSTZEN_EWB_HTTP_CONFIG);
  readonly headerPrefs = inject(GstZenEwbHeaderPrefsService);

  readonly docPageUrl =
    'https://my.gstzen.in/docs/api/ewaybill-api/get-eway-bill/' as const;
  readonly apiEndpoint = computed(() => resolveEwbGetUrl(this.httpCfg));
  readonly includeGstinHeader = computed(() => this.headerPrefs.includeGstinHeader());

  readonly minimalPayloadExample = `{
  "ewbNo": 141010270204
}`;

  readonly form = new FormGroup({
    ewbNo: new FormControl('', {
      nonNullable: true,
      validators: [ewbNoValidator()],
    }),
    gstin: new FormControl('', {
      nonNullable: true,
      validators: [optionalGstinValidator()],
    }),
  });

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly result = signal<Record<string, unknown> | null>(null);

  submit(): void {
    this.errorMessage.set(null);
    this.result.set(null);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const ewbRaw = this.form.controls.ewbNo.value.replace(/\s+/g, '');
    const gstinRaw = this.form.controls.gstin.value.trim();
    if (this.includeGstinHeader() && !gstinRaw) {
      this.errorMessage.set(
        'GSTIN is required when the “Include GSTIN header” option is enabled for e-way API calls (top bar).',
      );
      return;
    }
    if (gstinRaw && !gstinValidator(gstinRaw)) {
      this.errorMessage.set('Enter a valid 15-character GSTIN, or leave it blank.');
      return;
    }
    this.loading.set(true);
    this.api
      .getEwayBill(
        { ewbNo: Number(ewbRaw) },
        gstinRaw ? gstinRaw.toUpperCase() : undefined,
      )
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
}
