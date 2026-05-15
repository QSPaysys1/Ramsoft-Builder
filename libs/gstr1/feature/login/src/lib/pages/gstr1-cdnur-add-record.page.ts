import { JsonPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  type AbstractControl,
  type FormGroup,
  type ValidationErrors,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  Gstr1GstnOtpApiService,
  RETURN_PERIOD_REGEX,
  coerceGstr1DownloadApiName,
  type Gstr1DownloadApiName,
} from '@ramsoft-builder/gstr1/data-access/gstzen-auth';
import { firstValueFrom, merge } from 'rxjs';
import { startWith } from 'rxjs/operators';
import { INDIAN_STATE_POS_OPTIONS } from '../constants/indian-state-pos.options';

/** CDNUR `typ` — Credit/Debit notes issued to unregistered persons / exports (NIC codes). */
export const CDNUR_TYP_OPTIONS = [
  { value: 'B2CL', label: 'B2CL' },
  { value: 'B2CS', label: 'B2CS' },
  { value: 'EXPWPAY', label: 'EXPWPAY' },
  { value: 'EXPWOPAY', label: 'EXPWOPAY' },
] as const;

const CDNUR_RATE_SLABS = [
  0, 0.1, 0.25, 1, 1.5, 3, 5, 6, 7.5, 12, 18, 28, 40,
] as const;

function stripAmountCommas(raw: string): string {
  return raw.replace(/,/g, '').trim();
}

function toNicDate(value: string): string {
  const v = value.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (iso) {
    return `${iso[3]}-${iso[2]}-${iso[1]}`;
  }
  return v.replace(/\//g, '-');
}

function formatIndianIntegerDigits(digits: string): string {
  const d = digits.replace(/^0+(?=\d)/, '') || '0';
  if (d.length <= 3) {
    return d;
  }
  const last3 = d.slice(-3);
  let rest = d.slice(0, -3);
  const parts: string[] = [last3];
  while (rest.length > 0) {
    parts.unshift(rest.slice(-2));
    rest = rest.slice(0, -2);
  }
  return parts.join(',');
}

function formatIndianInvoiceAmountDisplay(raw: string): string {
  const s = stripAmountCommas(raw);
  if (!s) {
    return '';
  }
  const neg = s.startsWith('-');
  const body = neg ? s.slice(1) : s;
  const [intRaw, decRaw] = body.split('.');
  const intDigits = intRaw?.replace(/\D/g, '') ?? '';
  if (!intDigits) {
    return '';
  }
  let out = neg ? '-' : '';
  out += formatIndianIntegerDigits(intDigits);
  if (decRaw !== undefined) {
    const dec = decRaw.replace(/\D/g, '').slice(0, 2);
    if (dec.length > 0) {
      out += `.${dec}`;
    }
  }
  return out;
}

function indianInvoiceAmountValidator(control: AbstractControl): ValidationErrors | null {
  const raw = (control.value as string | null | undefined)?.trim();
  if (!raw) {
    return null;
  }
  const n = stripAmountCommas(raw);
  if (!/^\d+(\.\d{1,2})?$/.test(n)) {
    return { invoiceAmount: true };
  }
  return null;
}

const OPTIONAL_AMOUNT = Validators.pattern(/^$|^\d+(\.\d{1,2})?$/);

@Component({
  selector: 'lib-gstr1-cdnur-add-record-page',
  standalone: true,
  imports: [JsonPipe, RouterLink, ReactiveFormsModule],
  templateUrl: './gstr1-cdnur-add-record.page.html',
  styleUrl: './gstr1-b2b-add-record.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-[60vh]' },
})
export class Gstr1CdnurAddRecordPageComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(Gstr1GstnOtpApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly apiName = signal<Gstr1DownloadApiName>('cdnur');
  readonly filerGstin = signal('');
  readonly retPeriod = signal('');
  readonly filingStatusLabel = signal('');
  readonly dueDateLabel = signal('');

  readonly saveSubmitting = signal(false);
  readonly saveError = signal<unknown>(null);
  readonly saveSuccessPayload = signal<unknown>(null);
  readonly requestPayloadJson = signal<string>('');

  readonly statePosOptions = INDIAN_STATE_POS_OPTIONS;
  readonly rateSlabs = CDNUR_RATE_SLABS;
  readonly typOptions = CDNUR_TYP_OPTIONS;

  readonly form = this.fb.group({
    chkDiffRate: [false],
    diffPercent: ['', OPTIONAL_AMOUNT],
    typ: ['B2CL', Validators.required],
    nt_num: ['', Validators.required],
    nt_dt: ['', [Validators.required, Validators.pattern(/^\d{4}-\d{2}-\d{2}$/)]],
    val: ['', [Validators.required, indianInvoiceAmountValidator]],
    ntty: ['', Validators.required],
    pos: ['', [Validators.required, Validators.pattern(/^\d{2}$/)]],
    rateRows: this.fb.array(
      CDNUR_RATE_SLABS.map(() =>
        this.fb.group({
          txval: ['', OPTIONAL_AMOUNT],
          iamt: ['', OPTIONAL_AMOUNT],
          csamt: ['', OPTIONAL_AMOUNT],
          camt: ['', OPTIONAL_AMOUNT],
          samt: ['', OPTIONAL_AMOUNT],
        }),
      ),
    ),
  });

  constructor() {
    this.form.controls.chkDiffRate.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((on) => {
      const d = this.form.controls.diffPercent;
      if (on) {
        d.setValidators([Validators.required, Validators.pattern(/^\d+(\.\d{1,3})?$/)]);
        d.markAsTouched();
      } else {
        d.setValidators([OPTIONAL_AMOUNT]);
        d.markAsUntouched();
      }
      d.updateValueAndValidity();
      this.cdr.markForCheck();
    });

    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((pm) => {
      const api = coerceGstr1DownloadApiName(pm.get('apiName'));
      const g = (pm.get('gstin') ?? '').trim().toUpperCase();
      const rp = (pm.get('retPeriod') ?? '').trim();
      this.apiName.set(api);
      this.filerGstin.set(g);
      this.retPeriod.set(rp);
      if (api !== 'cdnur' && api !== 'cdnur-einv') {
        void this.router.navigate(['/gstr1/workspace/gstr1-download/section', api, g, rp], {
          replaceUrl: true,
        });
      }
      this.refreshRequestPayloadPreview();
    });

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((qm) => {
      this.filingStatusLabel.set((qm.get('filing_status') ?? '').trim());
      this.dueDateLabel.set((qm.get('due_date') ?? '').trim());
    });

    this.form.controls.pos.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.cdr.markForCheck();
    });

    merge(this.form.valueChanges, this.form.statusChanges)
      .pipe(startWith(null), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refreshRequestPayloadPreview());
  }

  get rateRows(): FormArray<FormGroup> {
    return this.form.controls.rateRows;
  }

  supplyTypeLabel(): string {
    const pos = this.form.controls.pos.value?.trim() ?? '';
    const filer = this.filerGstin().trim().toUpperCase();
    if (pos.length !== 2 || filer.length !== 15) {
      return '—';
    }
    return pos === filer.slice(0, 2) ? 'Intra-State' : 'Inter-State';
  }

  isIntraStateSupply(): boolean {
    return this.supplyTypeLabel() === 'Intra-State';
  }

  showFieldError(ctrl: AbstractControl): boolean {
    return ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  onInvoiceValFocus(): void {
    const c = this.form.controls.val;
    const raw = (c.value ?? '').toString().trim();
    const stripped = stripAmountCommas(raw);
    if (raw !== stripped && stripped.length > 0) {
      c.setValue(stripped, { emitEvent: false });
      c.updateValueAndValidity({ emitEvent: false });
    }
    this.cdr.markForCheck();
  }

  onInvoiceValBlur(): void {
    const c = this.form.controls.val;
    const stripped = stripAmountCommas((c.value ?? '').toString());
    if (!stripped) {
      c.setValue('', { emitEvent: true });
      c.updateValueAndValidity();
      this.cdr.markForCheck();
      return;
    }
    c.setValue(formatIndianInvoiceAmountDisplay(stripped), { emitEvent: true });
    c.updateValueAndValidity();
    this.cdr.markForCheck();
  }

  paramsValid(): boolean {
    return (
      this.filerGstin().length === 15 &&
      RETURN_PERIOD_REGEX.test(this.retPeriod().trim()) &&
      (this.apiName() === 'cdnur' || this.apiName() === 'cdnur-einv')
    );
  }

  backUrl(): unknown[] {
    return [
      '/gstr1/workspace/gstr1-download/section',
      this.apiName(),
      this.filerGstin(),
      this.retPeriod().trim(),
    ];
  }

  backQueryParams(): Record<string, string> {
    const o: Record<string, string> = {};
    const fs = this.filingStatusLabel().trim();
    const dd = this.dueDateLabel().trim();
    if (fs) {
      o['filing_status'] = fs;
    }
    if (dd) {
      o['due_date'] = dd;
    }
    return o;
  }

  private parseAmt(s: string | undefined): number {
    const n = Number.parseFloat((s ?? '').trim());
    return Number.isFinite(n) ? n : 0;
  }

  private refreshRequestPayloadPreview(): void {
    const p = this.buildRetsavePayload();
    this.requestPayloadJson.set(
      p
        ? JSON.stringify(p, null, 2)
        : '// Fix GSTIN and return period in the URL to preview the retsave payload.',
    );
    this.cdr.markForCheck();
  }

  private buildRetsavePayload(): Record<string, unknown> | null {
    if (!this.paramsValid()) {
      return null;
    }
    const fv = this.form.getRawValue() as {
      chkDiffRate: boolean;
      diffPercent: string;
      typ: string;
      nt_num: string;
      nt_dt: string;
      ntty: string;
      val: string;
      pos: string;
    };

    const intra = this.isIntraStateSupply();
    const itms: { num: number; itm_det: Record<string, unknown> }[] = [];
    let num = 0;
    const rowVals = this.rateRows.getRawValue() as {
      txval: string;
      iamt: string;
      csamt: string;
      camt: string;
      samt: string;
    }[];

    for (let i = 0; i < CDNUR_RATE_SLABS.length; i++) {
      const row = rowVals[i];
      const rt = CDNUR_RATE_SLABS[i];
      const txval = this.parseAmt(row?.txval);
      let iamt = this.parseAmt(row?.iamt);
      let camt = this.parseAmt(row?.camt);
      let samt = this.parseAmt(row?.samt);
      const csamt = this.parseAmt(row?.csamt);

      if (txval === 0 && iamt === 0 && camt === 0 && samt === 0 && csamt === 0) {
        continue;
      }

      if (intra && iamt !== 0 && camt === 0 && samt === 0) {
        camt = iamt / 2;
        samt = iamt / 2;
        iamt = 0;
      }

      num += 1;
      const itmDet: Record<string, unknown> = {
        rt,
        txval,
        iamt,
        csamt,
      };
      if (camt !== 0 || samt !== 0) {
        itmDet['camt'] = camt;
        itmDet['samt'] = samt;
      }
      itms.push({ num, itm_det: itmDet });
    }

    const parseN = (s: string): number => Number.parseFloat(stripAmountCommas(s));
    const entry: Record<string, unknown> = {
      typ: (fv.typ ?? '').trim().toUpperCase(),
      ntty: (fv.ntty ?? '').trim().toUpperCase().charAt(0),
      nt_num: (fv.nt_num ?? '').trim(),
      nt_dt: toNicDate((fv.nt_dt ?? '').trim()),
      pos: (fv.pos ?? '').trim(),
      val: parseN(fv.val ?? ''),
      itms,
    };

    const dpfRaw = fv.diffPercent?.trim();
    if (fv.chkDiffRate && dpfRaw) {
      entry['diff_percent'] = parseN(dpfRaw);
    }

    const turnoverFromNote = parseN(fv.val ?? '');

    return {
      fp: this.retPeriod().trim(),
      gstin: this.filerGstin().trim().toUpperCase(),
      gt: turnoverFromNote,
      cur_gt: turnoverFromNote,
      cdnur: [entry],
    };
  }

  private rateGridHasData(): boolean {
    const rows = this.rateRows.getRawValue() as {
      txval: string;
      iamt: string;
      csamt: string;
      camt: string;
      samt: string;
    }[];
    return rows.some(
      (r) =>
        this.parseAmt(r.txval) !== 0 ||
        this.parseAmt(r.iamt) !== 0 ||
        this.parseAmt(r.csamt) !== 0 ||
        this.parseAmt(r.camt) !== 0 ||
        this.parseAmt(r.samt) !== 0,
    );
  }

  async submit(): Promise<void> {
    if (!this.paramsValid()) {
      return;
    }

    if (!this.rateGridHasData()) {
      this.saveError.set({
        message: 'Enter taxable value and tax in at least one rate row in Item details.',
      });
      this.cdr.markForCheck();
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }

    this.saveSubmitting.set(true);
    this.saveError.set(null);
    this.saveSuccessPayload.set(null);

    const payload = this.buildRetsavePayload();
    if (!payload) {
      this.saveSubmitting.set(false);
      this.cdr.markForCheck();
      return;
    }

    try {
      const res = await firstValueFrom(this.api.retsaveGstr1Return(payload));
      this.saveSuccessPayload.set(res);
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse) {
        let body = err.error;
        if (typeof body === 'string') {
          try {
            body = JSON.parse(body) as unknown;
          } catch {
            /* keep string */
          }
        }
        this.saveError.set({
          status: err.status,
          statusText: err.statusText,
          body,
        });
      } else {
        this.saveError.set({ message: err instanceof Error ? err.message : String(err) });
      }
    } finally {
      this.saveSubmitting.set(false);
      this.cdr.markForCheck();
    }
  }
}
