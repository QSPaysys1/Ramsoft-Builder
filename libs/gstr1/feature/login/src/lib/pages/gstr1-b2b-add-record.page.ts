import { JsonPipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
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
import { fetchGstinTaxpayerDisplayNames$ } from '../utils/gstin-search-taxpayer.utils';
import { indianGstinValidator, isIndianGstinFormat } from '../validators/indian-gstin.validator';

/** Rate slabs matching GST portal B2B item grid (percent). */
export const B2B_GSTR1_RATE_SLABS = [
  0, 0.1, 0.25, 1, 1.5, 3, 5, 6, 7.5, 12, 18, 28, 40,
] as const;

function stripAmountCommas(raw: string): string {
  return raw.replace(/,/g, '').trim();
}

/** NIC invoice date: calendar ISO (YYYY-MM-DD), DD/MM/YYYY, or DD-MM-YYYY → DD-MM-YYYY. */
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

/** Display amount like 5,56,930.30 (Indian grouping). */
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

function optionalGstinValidator(control: AbstractControl): ValidationErrors | null {
  const raw = (control.value as string | null | undefined)?.trim();
  if (!raw) {
    return null;
  }
  return indianGstinValidator(control);
}

const OPTIONAL_AMOUNT = Validators.pattern(/^$|^\d+(\.\d{1,2})?$/);

/** Demo trade-name lookup until master API exists (portal-style preview). */
const DEMO_RECIPIENT_TRADE_BY_GSTIN: Readonly<Record<string, string>> = {
  '37BFNPA6643G2ZC': 'VENKATA RAMANA TRADERS',
  '01AAAAP1208Q1ZS': 'Registered Customer (demo)',
  '01AABCE2207R1Z5': 'Sample B2B recipient (demo)',
};

@Component({
  selector: 'lib-gstr1-b2b-add-record-page',
  standalone: true,
  imports: [JsonPipe, RouterLink, ReactiveFormsModule],
  templateUrl: './gstr1-b2b-add-record.page.html',
  styleUrl: './gstr1-b2b-add-record.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-[60vh]' },
})
export class Gstr1B2bAddRecordPageComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(Gstr1GstnOtpApiService);
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly apiName = signal<Gstr1DownloadApiName>('b2b');
  readonly filerGstin = signal('');
  readonly retPeriod = signal('');
  readonly filingStatusLabel = signal('');
  readonly dueDateLabel = signal('');

  readonly saveSubmitting = signal(false);
  readonly saveError = signal<unknown>(null);
  readonly saveSuccessPayload = signal<unknown>(null);

  /** From GSTR-1A workspace: `?gstr1a=1` → `POST .../api/gstr1a/retsave/`. */
  readonly isGstr1aWorkspace = signal(false);

  readonly requestPayloadJson = signal<string>('');

  readonly recipientTradeName = signal('');
  readonly recipientMasterName = signal('');
  readonly gstinLookupLoading = signal(false);

  readonly statePosOptions = INDIAN_STATE_POS_OPTIONS;
  readonly rateSlabs = B2B_GSTR1_RATE_SLABS;

  readonly form = this.fb.group({
    ctin: ['', [Validators.required, indianGstinValidator]],
    inum: ['', Validators.required],
    idt: ['', [Validators.required, Validators.pattern(/^\d{4}-\d{2}-\d{2}$/)]],
    val: ['', [Validators.required, indianInvoiceAmountValidator]],
    pos: ['', [Validators.required, Validators.pattern(/^\d{2}$/)]],
    chkRchrg: [false],
    chkDiffRate: [false],
    diffPercent: ['', OPTIONAL_AMOUNT],
    etin: ['', optionalGstinValidator],
    rateRows: this.fb.array(
      B2B_GSTR1_RATE_SLABS.map(() =>
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
      if (api !== 'b2b' && api !== 'b2b-einv') {
        void this.router.navigate(['/gstr1/workspace/gstr1-download/section', api, g, rp], {
          replaceUrl: true,
        });
      }
      this.refreshRequestPayloadPreview();
    });
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((qm) => {
      this.filingStatusLabel.set((qm.get('filing_status') ?? '').trim());
      this.dueDateLabel.set((qm.get('due_date') ?? '').trim());
      this.isGstr1aWorkspace.set(
        qm.get('gstr1a') === '1' || (qm.get('return') ?? '').toLowerCase() === 'gstr1a',
      );
    });

    this.form.controls.ctin.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      const raw = (this.form.controls.ctin.value ?? '').toString().trim().toUpperCase().replace(/\s/g, '');
      if (!isIndianGstinFormat(raw)) {
        this.recipientTradeName.set('');
        this.recipientMasterName.set('');
        this.cdr.markForCheck();
      }
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

  isIntraStateSupply(): boolean {
    const pos = this.form.controls.pos.value?.trim() ?? '';
    const filer = this.filerGstin().trim().toUpperCase();
    if (pos.length !== 2 || filer.length !== 15) {
      return false;
    }
    return pos === filer.slice(0, 2);
  }

  /** Inline validation: show errors as soon as the field is dirty or touched. */
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

  onRecipientGstinBlur(): void {
    this.applyRecipientGstinLookup();
  }

  /** Blur, Go, or Enter — normalize GSTIN and fetch trade / legal name (same search as e-invoice). */
  applyRecipientGstinLookup(): void {
    const c = this.form.controls.ctin;
    const normalized = (c.value ?? '').toString().trim().toUpperCase().replace(/\s/g, '');
    c.setValue(normalized, { emitEvent: false });
    c.markAsTouched();
    c.updateValueAndValidity({ emitEvent: true });
    void this.runRecipientGstinLookup(normalized);
  }

  onRecipientGstinGo(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.applyRecipientGstinLookup();
  }

  private async runRecipientGstinLookup(gstin: string): Promise<void> {
    if (!isIndianGstinFormat(gstin)) {
      this.recipientTradeName.set('');
      this.recipientMasterName.set('');
      this.cdr.markForCheck();
      return;
    }
    this.gstinLookupLoading.set(true);
    try {
      const names = await firstValueFrom(fetchGstinTaxpayerDisplayNames$(this.http, gstin));
      if (names && (names.tradeNam || names.lgnm)) {
        this.recipientTradeName.set(names.tradeNam || names.lgnm);
        this.recipientMasterName.set(names.lgnm);
      } else {
        this.applyRecipientNameFallback(gstin);
      }
    } catch {
      this.applyRecipientNameFallback(gstin);
    } finally {
      this.gstinLookupLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  private applyRecipientNameFallback(gstin: string): void {
    const demo = DEMO_RECIPIENT_TRADE_BY_GSTIN[gstin];
    this.recipientTradeName.set(demo ?? 'Registered party (GSTIN verified)');
    this.recipientMasterName.set('');
  }

  addRecipientToMaster(): void {
    void this.router.navigate(['/gstr1/workspace/returns-dashboard']);
  }

  paramsValid(): boolean {
    return (
      this.filerGstin().length === 15 &&
      RETURN_PERIOD_REGEX.test(this.retPeriod().trim()) &&
      (this.apiName() === 'b2b' || this.apiName() === 'b2b-einv')
    );
  }

  backUrl(): unknown[] {
    if (this.isGstr1aWorkspace()) {
      return ['/gstr1/workspace/gstr1a-view'];
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
    if (this.isGstr1aWorkspace()) {
      o['gstin'] = this.filerGstin();
      o['ret_period'] = this.retPeriod().trim();
      o['api_name'] = 'b2b';
      const fs = this.filingStatusLabel().trim();
      if (fs) {
        o['filing_status'] = fs;
      }
      return o;
    }
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
      ctin: string;
      inum: string;
      idt: string;
      val: string;
      pos: string;
      etin: string;
      chkRchrg: boolean;
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

    for (let i = 0; i < B2B_GSTR1_RATE_SLABS.length; i++) {
      const row = rowVals[i];
      const rt = B2B_GSTR1_RATE_SLABS[i];
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
    const inv: Record<string, unknown> = {
      inum: (fv.inum ?? '').trim(),
      idt: toNicDate((fv.idt ?? '').trim()),
      val: parseN(fv.val ?? ''),
      pos: (fv.pos ?? '').trim(),
      rchrg: fv.chkRchrg ? 'Y' : 'N',
      inv_typ: 'R',
      itms,
    };

    const etin = fv.etin?.trim();
    if (etin) {
      inv['etin'] = etin.toUpperCase();
    }
    const dpf = fv.diffPercent?.trim();
    if (fv.chkDiffRate && dpf) {
      inv['diff_percent'] = parseN(dpf);
    }

    const turnoverFromInvoice = parseN(fv.val ?? '');

    return {
      fp: this.retPeriod().trim(),
      gstin: this.filerGstin().trim().toUpperCase(),
      gt: turnoverFromInvoice,
      cur_gt: turnoverFromInvoice,
      b2b: [
        {
          ctin: (fv.ctin ?? '').trim().toUpperCase(),
          inv: [inv],
        },
      ],
    };
  }

  /** True when any slab row has non-zero taxable / tax. */
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
      const req = this.isGstr1aWorkspace()
        ? this.api.retsaveGstr1aReturn(payload)
        : this.api.retsaveGstr1Return(payload);
      const res = await firstValueFrom(req);
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
