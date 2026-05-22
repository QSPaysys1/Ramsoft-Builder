import { isPlatformBrowser, JsonPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  type AbstractControl,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  Gstr1GstnOtpApiService,
  RETURN_PERIOD_REGEX,
  coerceGstr1DownloadApiName,
  type Gstr1DownloadApiName,
} from '@ramsoft-builder/gstr1/data-access/gstzen-auth';
import { firstValueFrom } from 'rxjs';
import { debounceTime, distinctUntilChanged, startWith } from 'rxjs/operators';
import { lookupGstr1Hsn, normalizeHsnCode } from './gstr1-hsn-lookup.utils';

/** NIC-style unit quantity codes (subset — portal uses standard list). */
export const GSTR1_HSN_UQC_OPTIONS = [
  { value: '', label: 'Select' },
  { value: 'KGS', label: 'KGS — Kilograms' },
  { value: 'NOS', label: 'NOS — Numbers' },
  { value: 'PCS', label: 'PCS — Pieces' },
  { value: 'MTR', label: 'MTR — Meters' },
  { value: 'LTR', label: 'LTR — Litres' },
  { value: 'SET', label: 'SET — Sets' },
  { value: 'UNT', label: 'UNT — Units' },
  { value: 'BOX', label: 'BOX — Boxes' },
  { value: 'BDL', label: 'BDL — Bundles' },
  { value: 'TON', label: 'TON — Tonnes' },
  { value: 'GRM', label: 'GRM — Grams' },
  { value: 'kg', label: 'kg (legacy)' },
  { value: 'NA', label: 'NA — Not applicable (services)' },
  { value: 'OTH', label: 'OTH — Others' },
] as const;

const HSN_RATE_OPTIONS = [
  { value: '', label: 'Select' },
  ...[0, 0.1, 0.25, 1, 1.5, 3, 5, 6, 7.5, 12, 18, 28, 40].map((rt) => ({
    value: String(rt),
    label: `${rt}%`,
  })),
] as const;

function stripAmountCommas(raw: string): string {
  return raw.replace(/,/g, '').trim();
}

const REQUIRED_AMOUNT = [
  Validators.required,
  Validators.pattern(/^\d+(\.\d{1,2})?$/),
];

const OPTIONAL_AMOUNT = Validators.pattern(/^$|^\d+(\.\d{1,2})?$/);

@Component({
  selector: 'lib-gstr1-hsn-summary-add-page',
  standalone: true,
  imports: [JsonPipe, RouterLink, ReactiveFormsModule],
  templateUrl: './gstr1-hsn-summary-add.page.html',
  styleUrl: './gstr1-b2b-add-record.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-[60vh]' },
})
export class Gstr1HsnSummaryAddPageComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(Gstr1GstnOtpApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly apiName = signal<Gstr1DownloadApiName>('hsnsum');
  readonly filerGstin = signal('');
  readonly retPeriod = signal('');
  readonly filingStatusLabel = signal('');
  readonly dueDateLabel = signal('');

  readonly supplyTab = signal<'b2b' | 'b2c'>('b2b');

  readonly saveSubmitting = signal(false);
  readonly saveError = signal<unknown>(null);
  readonly saveSuccessPayload = signal<unknown>(null);
  readonly requestPayloadJson = signal<string>('');
  readonly importStubMessage = signal<string | null>(null);
  readonly hsnAsideDescription = signal('');
  readonly hsnLookupStatus = signal<'idle' | 'hit' | 'miss'>('idle');

  readonly uqcOptions = GSTR1_HSN_UQC_OPTIONS;
  readonly rateOptions = HSN_RATE_OPTIONS;

  readonly form = this.fb.group({
    hsn_sc: ['', [Validators.required, Validators.pattern(/^[0-9A-Za-z]{2,10}$/)]],
    product_name: ['', Validators.required],
    desc: ['', Validators.required],
    qty: ['', REQUIRED_AMOUNT],
    txval: ['', REQUIRED_AMOUNT],
    uqc: ['', Validators.required],
    rt: ['', Validators.required],
    iamt: ['', REQUIRED_AMOUNT],
    camt: ['', [OPTIONAL_AMOUNT]],
    samt: ['', [OPTIONAL_AMOUNT]],
    csamt: ['', [OPTIONAL_AMOUNT]],
  });

  descPerHsnDisplay(): string {
    const d = (this.form.controls.desc.value ?? '').toString().trim();
    return d || '—';
  }

  showHsnLookupMissHint(): boolean {
    if (this.hsnLookupStatus() !== 'miss') {
      return false;
    }
    const raw = (this.form.controls.hsn_sc.value ?? '').toString().trim();
    return raw.length >= 2;
  }

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((pm) => {
      const api = coerceGstr1DownloadApiName(pm.get('apiName'));
      const g = (pm.get('gstin') ?? '').trim().toUpperCase();
      const rp = (pm.get('retPeriod') ?? '').trim();
      this.apiName.set(api);
      this.filerGstin.set(g);
      this.retPeriod.set(rp);
      if (api !== 'hsnsum') {
        void this.router.navigate(['/gstr1/workspace/gstr1-download/section', api, g, rp], {
          replaceUrl: true,
        });
      }
      this.refreshRequestPayloadPreview();
    });

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((qm) => {
      this.filingStatusLabel.set((qm.get('filing_status') ?? '').trim());
      this.dueDateLabel.set((qm.get('due_date') ?? '').trim());
      const tab = (qm.get('hsn_tab') ?? '').trim().toLowerCase();
      if (tab === 'b2c') {
        this.supplyTab.set('b2c');
      } else if (tab === 'b2b') {
        this.supplyTab.set('b2b');
      }
    });

    this.form.valueChanges.pipe(startWith(null), takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.refreshRequestPayloadPreview();
      this.cdr.markForCheck();
    });
    this.form.statusChanges.pipe(startWith(null), takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.refreshRequestPayloadPreview();
      this.cdr.markForCheck();
    });

    this.form.controls.hsn_sc.valueChanges
      .pipe(debounceTime(280), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => this.applyHsnLookup(String(v ?? '')));
  }

  onHsnBlur(): void {
    this.applyHsnLookup(String(this.form.controls.hsn_sc.value ?? ''));
  }

  private applyHsnLookup(raw: string): void {
    const trimmed = String(raw ?? '').trim();
    const norm = normalizeHsnCode(trimmed);
    if (norm.length < 2) {
      this.hsnAsideDescription.set('');
      this.hsnLookupStatus.set('idle');
      this.cdr.markForCheck();
      return;
    }

    const hit = lookupGstr1Hsn(norm);
    if (!hit) {
      this.hsnAsideDescription.set('');
      this.hsnLookupStatus.set('miss');
      this.cdr.markForCheck();
      return;
    }

    this.hsnAsideDescription.set(hit.asideDescription);
    this.hsnLookupStatus.set('hit');

    const patch: Record<string, string> = {
      product_name: hit.productName,
      desc: hit.description,
    };
    if (hit.uqc) {
      patch['uqc'] = hit.uqc;
    }
    if (hit.rt !== undefined) {
      patch['rt'] = String(hit.rt);
    }

    this.form.patchValue(patch, { emitEvent: true });
    this.cdr.markForCheck();
  }

  setSupplyTab(tab: 'b2b' | 'b2c'): void {
    this.supplyTab.set(tab);
    this.importStubMessage.set(null);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { hsn_tab: tab },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    this.cdr.markForCheck();
  }

  showFieldError(ctrl: AbstractControl): boolean {
    return ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  paramsValid(): boolean {
    return (
      this.filerGstin().length === 15 &&
      RETURN_PERIOD_REGEX.test(this.retPeriod().trim()) &&
      this.apiName() === 'hsnsum'
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

  downloadHsnCodesList(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    window.open('https://cbic-gst.gov.in/gst-goods-services-rates.html', '_blank', 'noopener,noreferrer');
  }

  downloadHsnFromEinvoices(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    window.open('https://einvoice1.gst.gov.in/', '_blank', 'noopener,noreferrer');
  }

  importStub(): void {
    this.importStubMessage.set(
      'Import from e-invoices will map NIC JSON into this grid in a follow-up; use Add after entering values manually.',
    );
    this.cdr.markForCheck();
  }

  resetForm(): void {
    this.form.reset({
      hsn_sc: '',
      product_name: '',
      desc: '',
      qty: '',
      txval: '',
      uqc: '',
      rt: '',
      iamt: '',
      camt: '',
      samt: '',
      csamt: '',
    });
    this.saveError.set(null);
    this.saveSuccessPayload.set(null);
    this.importStubMessage.set(null);
    this.hsnAsideDescription.set('');
    this.hsnLookupStatus.set('idle');
    this.form.markAsUntouched();
    this.cdr.markForCheck();
  }

  private parseMoney(s: string | undefined): number {
    const n = Number.parseFloat(stripAmountCommas((s ?? '').trim()));
    return Number.isFinite(n) ? n : 0;
  }

  private parseRt(s: string | undefined): number {
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
  }

  private buildRetsavePayload(): Record<string, unknown> | null {
    if (!this.paramsValid()) {
      return null;
    }
    const v = this.form.getRawValue() as Record<string, string>;
    const qty = this.parseMoney(v['qty']);
    const txval = this.parseMoney(v['txval']);
    const iamt = this.parseMoney(v['iamt']);
    const camt = this.parseMoney(v['camt']);
    const samt = this.parseMoney(v['samt']);
    const csamt = this.parseMoney(v['csamt']);

    const rt = this.parseRt(v['rt']);
    /** NIC / GSTZen v4.1 `retsave` schema — `hsn.hsn_b2b[]` & `hsn.hsn_b2c[]`, not `hsn.data`. */
    const line: Record<string, unknown> = {
      num: 1,
      hsn_sc: (v['hsn_sc'] ?? '').trim(),
      desc: (v['desc'] ?? '').trim(),
      user_desc: (v['product_name'] ?? '').trim(),
      uqc: (v['uqc'] ?? '').trim(),
      qty,
      txval,
      iamt,
      csamt,
      rt,
    };

    if (camt !== 0) {
      line['camt'] = camt;
    }
    if (samt !== 0) {
      line['samt'] = samt;
    }

    const gt = txval + iamt + camt + samt + csamt;

    const tab = this.supplyTab();

    return {
      fp: this.retPeriod().trim(),
      gstin: this.filerGstin().trim().toUpperCase(),
      gt,
      cur_gt: gt,
      hsn: {
        hsn_b2b: tab === 'b2b' ? [line] : [],
        hsn_b2c: tab === 'b2c' ? [line] : [],
      },
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
            /* keep */
          }
        }
        this.saveError.set({ status: err.status, statusText: err.statusText, body });
      } else {
        this.saveError.set({ message: err instanceof Error ? err.message : String(err) });
      }
    } finally {
      this.saveSubmitting.set(false);
      this.cdr.markForCheck();
    }
  }
}
