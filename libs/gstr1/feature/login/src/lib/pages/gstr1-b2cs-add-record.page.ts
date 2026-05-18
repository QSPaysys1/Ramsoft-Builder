import { JsonPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  type AbstractControl,
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
import { indianGstinValidator } from '../validators/indian-gstin.validator';

const B2CS_GSTR1_RATE_SLABS = [
  0, 0.1, 0.25, 1, 1.5, 3, 5, 6, 7.5, 12, 18, 28, 40,
] as const;

function stripAmountCommas(raw: string): string {
  return raw.replace(/,/g, '').trim();
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

function roundMoney2(n: number): number {
  return Math.round(n * 100) / 100;
}

@Component({
  selector: 'lib-gstr1-b2cs-add-record-page',
  standalone: true,
  imports: [JsonPipe, RouterLink, ReactiveFormsModule],
  templateUrl: './gstr1-b2cs-add-record.page.html',
  styleUrl: './gstr1-b2b-add-record.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-[60vh]' },
})
export class Gstr1B2csAddRecordPageComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(Gstr1GstnOtpApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly apiName = signal<Gstr1DownloadApiName>('b2cs');
  readonly filerGstin = signal('');
  readonly retPeriod = signal('');
  readonly filingStatusLabel = signal('');
  readonly dueDateLabel = signal('');
  /** Opened from GSTR-1A B2CS workspace (`?gstr1a=1`). */
  readonly fromGstr1a = signal(false);

  readonly saveSubmitting = signal(false);
  readonly saveError = signal<unknown>(null);
  readonly saveSuccessPayload = signal<unknown>(null);

  readonly requestPayloadJson = signal<string>('');

  readonly moneyFmt = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  readonly statePosOptions = INDIAN_STATE_POS_OPTIONS;
  readonly rateSlabs = B2CS_GSTR1_RATE_SLABS;

  readonly gstr1aViewQueryParams = computed(() => ({
    gstin: this.filerGstin(),
    ret_period: this.retPeriod().trim(),
    api_name: 'b2cs',
    filing_status: this.filingStatusLabel().trim() || undefined,
  }));

  readonly form = this.fb.group({
    pos: ['', [Validators.required, Validators.pattern(/^\d{2}$/)]],
    txval: ['', [Validators.required, indianInvoiceAmountValidator]],
    /** NIC `typ`: E-commerce vs other — drives optional `etin`. */
    typ: ['OE', Validators.required],
    etin: [''],
    rt: ['', Validators.required],
  });

  constructor() {
    this.form.controls.typ.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((t) => {
      const e = this.form.controls.etin;
      if (t === 'E') {
        e.setValidators([Validators.required, indianGstinValidator]);
      } else {
        e.setValidators([]);
        e.setValue('', { emitEvent: false });
      }
      e.updateValueAndValidity({ emitEvent: false });
      this.cdr.markForCheck();
    });

    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((pm) => {
      const api = coerceGstr1DownloadApiName(pm.get('apiName'));
      const g = (pm.get('gstin') ?? '').trim().toUpperCase();
      const rp = (pm.get('retPeriod') ?? '').trim();
      this.apiName.set(api);
      this.filerGstin.set(g);
      this.retPeriod.set(rp);
      if (api !== 'b2cs') {
        void this.router.navigate(['/gstr1/workspace/gstr1-download/section', api, g, rp], {
          replaceUrl: true,
        });
      }
      this.refreshRequestPayloadPreview();
    });

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((qm) => {
      this.filingStatusLabel.set((qm.get('filing_status') ?? '').trim());
      this.dueDateLabel.set((qm.get('due_date') ?? '').trim());
      this.fromGstr1a.set((qm.get('gstr1a') ?? '').trim() === '1');
    });

    this.form.controls.pos.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.cdr.markForCheck();
    });

    merge(this.form.valueChanges, this.form.statusChanges)
      .pipe(startWith(null), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refreshRequestPayloadPreview());
  }

  /** Portal-style supply type label (Inter-State / Intra-State / — until POS is valid). */
  supplyTypeLabel(): string {
    const k = this.supplyTaxKind();
    if (k === 'inter') {
      return 'Inter-State';
    }
    if (k === 'intra') {
      return 'Intra-State';
    }
    return '—';
  }

  /**
   * Whether IGST applies vs CGST+SGST. Indeterminate until POS and filer GSTIN are both valid.
   */
  supplyTaxKind(): 'inter' | 'intra' | 'unknown' {
    const pos = this.form.controls.pos.value?.trim() ?? '';
    const filer = this.filerGstin().trim().toUpperCase();
    if (pos.length !== 2 || filer.length !== 15) {
      return 'unknown';
    }
    return pos !== filer.slice(0, 2) ? 'inter' : 'intra';
  }

  showFieldError(ctrl: AbstractControl): boolean {
    return ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  /** Read-only derived taxes for the form (portal parity). */
  derivedTaxFields(): { igst: number; cgst: number; sgst: number; cess: number } {
    const txval = this.parseAmt(this.form.controls.txval.value ?? '');
    const rtRaw = (this.form.controls.rt.value ?? '').toString().trim();
    const rt = Number.parseFloat(rtRaw);
    if (!Number.isFinite(rt) || rtRaw === '') {
      return { igst: 0, cgst: 0, sgst: 0, cess: 0 };
    }
    const taxTotal = roundMoney2((txval * rt) / 100);
    const kind = this.supplyTaxKind();
    if (kind === 'inter') {
      return { igst: taxTotal, cgst: 0, sgst: 0, cess: 0 };
    }
    if (kind === 'intra') {
      const cgst = roundMoney2(taxTotal / 2);
      const sgst = roundMoney2(taxTotal - cgst);
      return { igst: 0, cgst, sgst, cess: 0 };
    }
    return { igst: 0, cgst: 0, sgst: 0, cess: 0 };
  }

  formatDerivedMoney(n: number): string {
    return this.moneyFmt.format(n);
  }

  onTxvalFocus(): void {
    const c = this.form.controls.txval;
    const raw = (c.value ?? '').toString().trim();
    const stripped = stripAmountCommas(raw);
    if (raw !== stripped && stripped.length > 0) {
      c.setValue(stripped, { emitEvent: false });
      c.updateValueAndValidity({ emitEvent: false });
    }
    this.cdr.markForCheck();
  }

  onTxvalBlur(): void {
    const c = this.form.controls.txval;
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
      this.apiName() === 'b2cs'
    );
  }

  backUrl(): unknown[] {
    if (this.fromGstr1a()) {
      return ['/gstr1/workspace/gstr1a-b2cs', this.filerGstin(), this.retPeriod().trim()];
    }
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
    if (this.fromGstr1a()) {
      if (fs) {
        o['filing_status'] = fs;
      }
      return o;
    }
    if (fs) {
      o['filing_status'] = fs;
    }
    if (dd) {
      o['due_date'] = dd;
    }
    return o;
  }

  private parseAmt(s: string | undefined): number {
    const n = Number.parseFloat(stripAmountCommas((s ?? '').trim()));
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

  /**
   * NIC-style flat `b2cs[]` row — tax (`iamt` / `camt`+`samt`, `csamt`) derived from taxable value × rate (no manual tax inputs).
   */
  private buildRetsavePayload(): Record<string, unknown> | null {
    if (!this.paramsValid()) {
      return null;
    }
    const fv = this.form.getRawValue() as {
      pos: string;
      txval: string;
      typ: string;
      etin: string;
      rt: string;
    };

    const txval = this.parseAmt(fv.txval);
    const rt = Number.parseFloat((fv.rt ?? '').trim());
    if (!Number.isFinite(rt) || (fv.rt ?? '').trim() === '') {
      return null;
    }
    const inter = this.supplyTaxKind() === 'inter';
    const taxTotal = roundMoney2((txval * rt) / 100);

    const row: Record<string, unknown> = {};
    row['sply_ty'] = inter ? 'INTER' : 'INTRA';
    row['rt'] = rt;
    row['typ'] = (fv.typ ?? 'OE').trim() === 'E' ? 'E' : 'OE';
    const etin = fv.etin?.trim().toUpperCase();
    if (row['typ'] === 'E' && etin) {
      row['etin'] = etin;
    }
    row['pos'] = (fv.pos ?? '').trim();
    row['txval'] = txval;

    const csamt = 0;
    if (inter) {
      row['iamt'] = taxTotal;
    } else {
      const camt = roundMoney2(taxTotal / 2);
      const samt = roundMoney2(taxTotal - camt);
      row['camt'] = camt;
      row['samt'] = samt;
    }
    row['csamt'] = csamt;

    const turnover = txval + taxTotal + csamt;

    return {
      fp: this.retPeriod().trim(),
      gstin: this.filerGstin().trim().toUpperCase(),
      gt: turnover,
      cur_gt: turnover,
      b2cs: [row],
    };
  }

  async submit(): Promise<void> {
    if (!this.paramsValid()) {
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
