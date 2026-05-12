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
  Validators,
  type AbstractControl,
  type ValidationErrors,
  type ValidatorFn,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  EinvoiceApiService,
  EINVOICE_GSTZEN_HTTP_CONFIG,
  EinvoiceEnterpriseApiError,
  resolveEinvoiceGetByIrnUrl,
} from '@ramsoft-builder/einvoice/data-access/api';
import { finalize } from 'rxjs';

/** Indian GSTIN (15 chars), same rule as e-invoice create flow. */
const GSTIN_PATTERN =
  /^([0][1-9]|[1-2][0-9]|[3][0-7])([A-Z]{5}[0-9]{4}[A-Z][0-9A-Z][Z][0-9A-Z])$/;

const IRN_HEX_PATTERN = /^[0-9a-fA-F]{64}$/;

function sellerGstinValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = (control.value ?? '').toString().trim().toUpperCase();
    if (!raw) {
      return { required: true };
    }
    if (raw.length !== 15) {
      return { gstinLength: true };
    }
    return GSTIN_PATTERN.test(raw) ? null : { gstinPattern: true };
  };
}

function irnHexValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = (control.value ?? '').toString().trim();
    if (!raw) {
      return { required: true };
    }
    return IRN_HEX_PATTERN.test(raw) ? null : { irnPattern: true };
  };
}

function optionalIrpValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = (control.value ?? '').toString().trim();
    if (!raw) {
      return null;
    }
    return /^[A-Za-z0-9]+$/.test(raw) ? null : { irpPattern: true };
  };
}

@Component({
  selector: 'lib-einvoice-get-by-irn-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, JsonPipe],
  templateUrl: './einvoice-get-by-irn.page.html',
  styleUrl: './einvoice-flow-pages.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EinvoiceGetByIrnPageComponent {
  private readonly api = inject(EinvoiceApiService);
  private readonly httpCfg = inject(EINVOICE_GSTZEN_HTTP_CONFIG);

  readonly docPageUrl =
    'https://my.gstzen.in/docs/api/einvoice-api/einvoice-get-by-irn/' as const;
  readonly apiEndpoint = computed(() => resolveEinvoiceGetByIrnUrl(this.httpCfg));

  /** GSTZen minimal `geteinv` body (reference only). */
  readonly minimalPayloadExample = `{
  "SellerDtls": {
    "Gstin": "29AADCG4992P1ZP"
  },
  "Irn": "6572600aa1108dc76a11c05f427451fec1de7437881aa4e90e6e580cf89cf3f6"
}`;

  readonly form = new FormGroup({
    gstin: new FormControl('', {
      nonNullable: true,
      validators: [sellerGstinValidator()],
    }),
    irn: new FormControl('', {
      nonNullable: true,
      validators: [irnHexValidator()],
    }),
    irp: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(16), optionalIrpValidator()],
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
    const gstin = this.form.controls.gstin.value.trim().toUpperCase();
    const irn = this.form.controls.irn.value.trim();
    const irpRaw = this.form.controls.irp.value.trim();
    this.loading.set(true);
    this.api
      .getEinvoiceByIrn({
        gstin,
        irn,
        irp: irpRaw || undefined,
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => this.result.set(res),
        error: (err: unknown) => {
          const msg =
            err instanceof EinvoiceEnterpriseApiError
              ? err.message
              : 'Request failed.';
          this.errorMessage.set(msg);
        },
      });
  }
}
