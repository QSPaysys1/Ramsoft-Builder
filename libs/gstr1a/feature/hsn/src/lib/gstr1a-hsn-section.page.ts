import { isPlatformBrowser, JsonPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  computed,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  type AbstractControl,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthStore } from '@ramsoft-builder/auth/data-access/auth';
import { UserProfileRepository } from '@ramsoft-builder/e-invoices/data-access/einvoice';
import {
  Gstr1GstnOtpApiService,
  RETURN_PERIOD_REGEX,
  isGstr1DownloadSuccessEnvelope,
} from '@ramsoft-builder/gstr1/data-access/gstzen-auth';
import { catchError, firstValueFrom, of, switchMap } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { GSTR1_HSN_UQC_OPTIONS } from './gstr1-hsn-summary-add.page';
import { lookupGstr1Hsn, normalizeHsnCode } from './gstr1-hsn-lookup.utils';

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

function normalizeErrorEnvelope(err: unknown): unknown {
  if (err instanceof HttpErrorResponse) {
    const bodyUnknown = err.error;
    let parsedBody = bodyUnknown;
    if (typeof bodyUnknown === 'string') {
      try {
        parsedBody = JSON.parse(bodyUnknown) as unknown;
      } catch {
        parsedBody = bodyUnknown;
      }
    }
    return {
      httpStatus: err.status,
      statusText: err.statusText,
      url: err.url ?? null,
      body: parsedBody,
    };
  }
  if (err instanceof Error) {
    return { message: err.message };
  }
  return { message: String(err) };
}

function indianFyLabelFromMmYyyy(retPeriod: string): string {
  if (!RETURN_PERIOD_REGEX.test(retPeriod)) {
    return '—';
  }
  const mm = Number.parseInt(retPeriod.slice(0, 2), 10);
  const yyyy = Number.parseInt(retPeriod.slice(2), 10);
  const fyStart = mm >= 4 ? yyyy : yyyy - 1;
  return `${fyStart}-${String(fyStart + 1).slice(-2)}`;
}

function monthNameFromMmYyyy(retPeriod: string): string {
  if (!RETURN_PERIOD_REGEX.test(retPeriod)) {
    return '—';
  }
  const mm = Number.parseInt(retPeriod.slice(0, 2), 10);
  const yyyy = retPeriod.slice(2);
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  return `${months[mm - 1] ?? retPeriod} ${yyyy}`;
}

function pickProfileString(
  obj: Record<string, unknown> | undefined,
  keys: string[],
): string {
  if (!obj) {
    return '';
  }
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim()) {
      return v.trim();
    }
  }
  return '';
}

export type Gstr1aHsnSavedRowView = {
  num: number | null;
  hsn_sc: string;
  desc: string;
  uqc: string;
  qty: number;
  txval: number;
  rt: number;
  iamt: number;
  camt: number;
  samt: number;
  csamt: number;
};

function num(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) {
    return v;
  }
  const n = Number.parseFloat(String(v ?? '').trim());
  return Number.isFinite(n) ? n : 0;
}

function extractHsnBuckets(bucket: unknown): { b2b: unknown[]; b2c: unknown[] } {
  if (!bucket || typeof bucket !== 'object') {
    return { b2b: [], b2c: [] };
  }
  const o = bucket as Record<string, unknown>;
  const b2bRaw = o['hsn_b2b'];
  const b2cRaw = o['hsn_b2c'];
  const b2b = Array.isArray(b2bRaw) ? [...b2bRaw] : [];
  const b2c = Array.isArray(b2cRaw) ? [...b2cRaw] : [];
  if (b2b.length === 0 && b2c.length === 0) {
    const legacy = o['data'];
    if (Array.isArray(legacy)) {
      return { b2b: [...legacy], b2c: [] };
    }
  }
  return { b2b, b2c };
}

function mapHsnLine(raw: unknown): Gstr1aHsnSavedRowView | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const r = raw as Record<string, unknown>;
  const hsn_sc = String(r['hsn_sc'] ?? r['hsn_cd'] ?? '').trim();
  if (!hsn_sc) {
    return null;
  }
  const numRaw = r['num'];
  return {
    num:
      typeof numRaw === 'number' && Number.isFinite(numRaw)
        ? numRaw
        : Number.parseInt(String(numRaw ?? '').trim(), 10) || null,
    hsn_sc,
    desc: String(r['desc'] ?? '').trim(),
    uqc: String(r['uqc'] ?? '').trim(),
    qty: num(r['qty']),
    txval: num(r['txval']),
    rt: num(r['rt']),
    iamt: num(r['iamt']),
    camt: num(r['camt']),
    samt: num(r['samt']),
    csamt: num(r['csamt']),
  };
}

@Component({
  selector: 'lib-gstr1a-hsn-section-page',
  standalone: true,
  imports: [JsonPipe, RouterLink, ReactiveFormsModule],
  templateUrl: './gstr1a-hsn-section.page.html',
  styleUrl: './gstr1-b2b-add-record.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-[60vh]' },
})
export class Gstr1aHsnSectionPageComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(Gstr1GstnOtpApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly authStore = inject(AuthStore);
  private readonly userProfile = inject(UserProfileRepository);

  readonly gstin = signal('');
  readonly retPeriod = signal('');
  readonly filingLabel = signal('');
  readonly legalName = signal('');
  readonly tradeName = signal('');

  readonly supplyTab = signal<'b2b' | 'b2c'>('b2b');

  readonly sectionLoading = signal(false);
  readonly sectionError = signal<unknown>(null);
  readonly savedB2b = signal<readonly Gstr1aHsnSavedRowView[]>([]);
  readonly savedB2c = signal<readonly Gstr1aHsnSavedRowView[]>([]);
  readonly lastSyncedAt = signal<Date | null>(null);

  readonly saveSubmitting = signal(false);
  readonly saveError = signal<unknown>(null);
  readonly saveSuccessPayload = signal<unknown>(null);
  readonly requestPayloadJson = signal<string>('');

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

  readonly fyLabel = computed(() => indianFyLabelFromMmYyyy(this.retPeriod().trim()));
  readonly taxPeriodLabel = computed(() => monthNameFromMmYyyy(this.retPeriod().trim()));

  readonly paramsValid = computed(() => {
    const g = this.gstin().trim();
    const r = this.retPeriod().trim();
    return g.length === 15 && RETURN_PERIOD_REGEX.test(r);
  });

  readonly backToGstr1aQueryParams = computed(() => ({
    gstin: this.gstin().trim().toUpperCase() || undefined,
    ret_period: this.retPeriod().trim() || undefined,
    api_name: 'hsnsum',
    filing_status: this.filingLabel().trim() || undefined,
  }));

  readonly displayedSavedRows = computed(() =>
    this.supplyTab() === 'b2b' ? this.savedB2b() : this.savedB2c(),
  );

  readonly resetDisabled = computed(() => this.form.pristine && this.form.untouched);

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((pm) => {
      this.gstin.set((pm.get('gstin') ?? '').trim().toUpperCase());
      this.retPeriod.set((pm.get('retPeriod') ?? '').trim());
      if (this.paramsValid()) {
        void this.loadSectionFromApi();
      }
    });

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((qm) => {
      this.filingLabel.set((qm.get('filing_status') ?? '').trim());
      const tab = (qm.get('hsn_tab') ?? '').trim().toLowerCase();
      if (tab === 'b2c') {
        this.supplyTab.set('b2c');
      } else if (tab === 'b2b') {
        this.supplyTab.set('b2b');
      }
    });

    toObservable(this.authStore.user)
      .pipe(
        switchMap((user) => {
          if (!user?.id) {
            return of(undefined);
          }
          return this.userProfile.watchProfileData(user.id).pipe(catchError(() => of(undefined)));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((prof) => {
        const p = prof as Record<string, unknown> | undefined;
        this.legalName.set(
          pickProfileString(p, [
            'legalName',
            'LegalName',
            'legal_name',
            'companyName',
            'CompanyName',
            'organizationName',
            'OrganizationName',
            'name',
            'Name',
          ]),
        );
        this.tradeName.set(
          pickProfileString(p, ['tradeName', 'TradeName', 'trade_name', 'dba']),
        );
        this.cdr.markForCheck();
      });

    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.refreshRequestPayloadPreview();
      this.cdr.markForCheck();
    });
    this.form.statusChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.refreshRequestPayloadPreview();
      this.cdr.markForCheck();
    });

    this.form.controls.hsn_sc.valueChanges
      .pipe(debounceTime(280), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => this.applyHsnLookup(String(v ?? '')));

    this.refreshRequestPayloadPreview();
  }

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

  formatSynced(d: Date | null): string {
    if (!d) {
      return '—';
    }
    return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  }

  formatMoney(n: number): string {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  }

  openGstHelp(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    window.open('https://www.gst.gov.in/', '_blank', 'noopener,noreferrer');
  }

  setSupplyTab(tab: 'b2b' | 'b2c'): void {
    this.supplyTab.set(tab);
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

  async loadSectionFromApi(): Promise<void> {
    if (!this.paramsValid()) {
      return;
    }
    this.sectionLoading.set(true);
    this.sectionError.set(null);
    try {
      const raw = await firstValueFrom(
        this.api.downloadGstr1aReturn({
          gstin: this.gstin().trim().toUpperCase(),
          ret_period: this.retPeriod().trim(),
          api_name: 'hsnsum',
        }),
      );

      if (!isGstr1DownloadSuccessEnvelope(raw)) {
        this.sectionError.set({ message: 'Unexpected download response envelope.' });
        this.savedB2b.set([]);
        this.savedB2c.set([]);
        return;
      }

      const msg = raw.message as Record<string, unknown>;
      const bucket = msg['hsnsum'];
      const { b2b, b2c } = extractHsnBuckets(bucket);

      const mapLines = (arr: unknown[]): Gstr1aHsnSavedRowView[] =>
        arr.map(mapHsnLine).filter((x): x is Gstr1aHsnSavedRowView => x !== null);

      this.savedB2b.set(mapLines(b2b));
      this.savedB2c.set(mapLines(b2c));
      this.lastSyncedAt.set(new Date());
    } catch (err: unknown) {
      this.sectionError.set(normalizeErrorEnvelope(err));
      this.savedB2b.set([]);
      this.savedB2c.set([]);
    } finally {
      this.sectionLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  downloadHsnCodesList(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    window.open('https://cbic-gst.gov.in/gst-goods-services-rates.html', '_blank', 'noopener,noreferrer');
  }

  resetForm(clearAlerts = true): void {
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
    if (clearAlerts) {
      this.saveError.set(null);
      this.saveSuccessPayload.set(null);
    }
    this.hsnAsideDescription.set('');
    this.hsnLookupStatus.set('idle');
    this.form.markAsPristine();
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
        : '// Enter valid GSTIN and return period in the URL to preview retsave.',
    );
    this.cdr.markForCheck();
  }

  /**
   * GSTR-1A retsave uses top-level `hsn` with `hsn_b2b` / `hsn_b2c` arrays (GSTZen / NIC-style).
   */
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
      gstin: this.gstin().trim().toUpperCase(),
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

    const payload = this.buildRetsavePayload();
    if (!payload) {
      return;
    }

    this.saveSubmitting.set(true);
    this.saveError.set(null);
    this.saveSuccessPayload.set(null);

    try {
      const res = await firstValueFrom(this.api.retsaveGstr1aReturn(payload));
      this.saveSuccessPayload.set(res);
      await this.loadSectionFromApi();
      this.resetForm(false);
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
