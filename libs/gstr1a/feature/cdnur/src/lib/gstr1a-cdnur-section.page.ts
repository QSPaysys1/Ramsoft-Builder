import { isPlatformBrowser, JsonPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthStore } from '@ramsoft-builder/auth/data-access/auth';
import { UserProfileRepository } from '@ramsoft-builder/e-invoices/data-access/einvoice';
import {
  Gstr1GstnOtpApiService,
  GSTR1A_DOWNLOAD_API_OPTIONS,
  RETURN_PERIOD_REGEX,
  aggregateGstr1DownloadRows,
  extractGstr1DownloadMessageArray,
  filterGstr1DownloadHierarchy,
  flattenGstr1DownloadHierarchy,
  isGstr1DownloadSuccessEnvelope,
  parseGstr1DownloadHierarchy,
  type Gstr1DownloadCtinGroup,
  type Gstr1aDownloadApiName,
} from '@ramsoft-builder/gstr1/data-access/gstzen-auth';
import { catchError, firstValueFrom, of, switchMap } from 'rxjs';

type ViewState = 'idle' | 'loading' | 'success' | 'empty' | 'error';

const SECTION_API: Gstr1aDownloadApiName = 'cdnur';

/** CDNUR is a flat `typ` + note array; coerce `typ` into `ctin` for hierarchy grouping. */
function normalizeCdnurRecordsForHierarchy(records: unknown[]): unknown[] {
  const out: unknown[] = [];
  for (const rec of records) {
    if (!rec || typeof rec !== 'object') {
      continue;
    }
    const r = rec as Record<string, unknown>;
    const typRaw = r['typ'];
    const typ =
      typeof typRaw === 'string' && typRaw.trim()
        ? typRaw.trim().toUpperCase()
        : '—';
    out.push({ ...r, ctin: typ });
  }
  return out;
}

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

function num(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) {
    return v;
  }
  const n = Number.parseFloat(String(v ?? '').trim());
  return Number.isFinite(n) ? n : 0;
}

@Component({
  selector: 'lib-gstr1a-cdnur-section-page',
  standalone: true,
  imports: [JsonPipe, RouterLink],
  templateUrl: './gstr1a-cdnur-section.page.html',
  styleUrl: './gstr1a-cdnur-section.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-[60vh]' },
})
export class Gstr1aCdnurSectionPageComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(Gstr1GstnOtpApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly authStore = inject(AuthStore);
  private readonly userProfile = inject(UserProfileRepository);

  readonly sectionHint =
    GSTR1A_DOWNLOAD_API_OPTIONS.find((x) => x.value === 'cdnur')?.description ??
    'Credit/debit notes (unregistered)';

  readonly gstin = signal('');
  readonly retPeriod = signal('');
  readonly filingLabel = signal('');

  readonly filterQuery = signal('');
  readonly infoBannerDismissed = signal(false);
  readonly expandedCtins = signal(new Set<string>());

  readonly viewState = signal<ViewState>('idle');
  readonly loading = signal(false);
  readonly httpError = signal<unknown>(null);
  readonly logicalErrorText = signal<string | null>(null);
  readonly rawResponse = signal<unknown>(null);
  readonly lastSyncedAt = signal<Date | null>(null);

  readonly hierarchy = signal<readonly Gstr1DownloadCtinGroup[]>([]);

  readonly retsaveSubmitting = signal(false);
  readonly retsaveError = signal<unknown>(null);
  readonly retsaveSuccessPayload = signal<unknown>(null);

  readonly legalName = signal('');
  readonly tradeName = signal('');

  readonly fyLabel = computed(() => indianFyLabelFromMmYyyy(this.retPeriod().trim()));
  readonly taxPeriodLabel = computed(() => monthNameFromMmYyyy(this.retPeriod().trim()));

  readonly filteredHierarchy = computed(() =>
    filterGstr1DownloadHierarchy([...this.hierarchy()], this.filterQuery()),
  );

  /** Rows grouped by supply type (`typ`), stored as `ctin` after normalization. */
  readonly typeRows = computed(() => {
    const rows: {
      typ: string;
      noteCount: number;
      valSum: number;
      tx: number;
      igst: number;
      cgst: number;
      sgst: number;
      cess: number;
      invoices: Gstr1DownloadCtinGroup['invoices'];
    }[] = [];
    for (const g of this.filteredHierarchy()) {
      let valSum = 0;
      let tx = 0;
      let igst = 0;
      let cgst = 0;
      let sgst = 0;
      let cess = 0;
      for (const inv of g.invoices) {
        const face = inv.invoiceValue;
        if (typeof face === 'number' && Number.isFinite(face)) {
          valSum += face;
        }
        const t = this.invoiceTotals(inv);
        tx += t.tx;
        igst += t.igst;
        cgst += t.cgst;
        sgst += t.sgst;
        cess += t.cess;
      }
      rows.push({
        typ: g.ctin,
        noteCount: g.invoices.length,
        valSum,
        tx,
        igst,
        cgst,
        sgst,
        cess,
        invoices: g.invoices,
      });
    }
    return rows;
  });

  readonly aggregateStats = computed(() => {
    const flat = flattenGstr1DownloadHierarchy(this.hierarchy());
    const bucketLen = extractGstr1DownloadMessageArray(this.rawResponse() ?? {}, SECTION_API).length;
    return aggregateGstr1DownloadRows(flat, bucketLen);
  });

  readonly moneyFmt = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  readonly paramsValid = computed(() => {
    const g = this.gstin().trim();
    const r = this.retPeriod().trim();
    return g.length === 15 && RETURN_PERIOD_REGEX.test(r);
  });

  readonly canSubmitGstr1aRetsave = computed(() => {
    if (!this.paramsValid() || this.loading() || this.retsaveSubmitting()) {
      return false;
    }
    if (this.viewState() !== 'success') {
      return false;
    }
    return this.getRetsaveSectionForApi(this.rawResponse(), SECTION_API) !== null;
  });

  readonly backToGstr1aQueryParams = computed(() => ({
    gstin: this.gstin().trim().toUpperCase() || undefined,
    ret_period: this.retPeriod().trim() || undefined,
    api_name: SECTION_API,
    filing_status: this.filingLabel().trim() || undefined,
  }));

  readonly addRecordLink = computed((): readonly string[] => {
    const g = this.gstin().trim().toUpperCase();
    const r = this.retPeriod().trim();
    return ['/gstr1/workspace/gstr1-download/section', SECTION_API, g, r, 'add-cdnur'];
  });

  readonly addRecordQueryParams = computed(() => ({
    gstr1a: '1',
    filing_status: this.filingLabel().trim() || undefined,
  }));

  constructor() {
    const syncRouteParams = (): void => {
      const pm = this.route.snapshot.paramMap;
      const qm = this.route.snapshot.queryParamMap;
      this.gstin.set((qm.get('gstin') ?? pm.get('gstin') ?? '').trim().toUpperCase());
      this.retPeriod.set((qm.get('ret_period') ?? pm.get('retPeriod') ?? '').trim());
      this.filingLabel.set((qm.get('filing_status') ?? '').trim());
      void this.loadSection();
    };
    syncRouteParams();
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => syncRouteParams());
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => syncRouteParams());

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
      });
  }

  invoiceTotals(inv: Gstr1DownloadCtinGroup['invoices'][number]): {
    tx: number;
    igst: number;
    cgst: number;
    sgst: number;
    cess: number;
  } {
    return inv.items.reduce(
      (acc, it) => ({
        tx: acc.tx + it.taxableValue,
        igst: acc.igst + it.igst,
        cgst: acc.cgst + it.cgst,
        sgst: acc.sgst + it.sgst,
        cess: acc.cess + it.cess,
      }),
      { tx: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 },
    );
  }

  toggleTypRow(typ: string): void {
    const next = new Set(this.expandedCtins());
    if (next.has(typ)) {
      next.delete(typ);
    } else {
      next.add(typ);
    }
    this.expandedCtins.set(next);
  }

  typRowExpanded(typ: string): boolean {
    return this.expandedCtins().has(typ);
  }

  dismissInfoBanner(): void {
    this.infoBannerDismissed.set(true);
  }

  openGstHelp(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    window.open('https://www.gst.gov.in/', '_blank', 'noopener,noreferrer');
  }

  async loadSection(): Promise<void> {
    if (!this.paramsValid()) {
      this.viewState.set('idle');
      return;
    }
    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.viewState.set('loading');
    this.httpError.set(null);
    this.logicalErrorText.set(null);
    this.retsaveError.set(null);
    this.retsaveSuccessPayload.set(null);
    this.hierarchy.set([]);
    this.expandedCtins.set(new Set());
    this.infoBannerDismissed.set(false);

    try {
      const raw = await firstValueFrom(
        this.api.downloadGstr1aReturn({
          gstin: this.gstin().trim().toUpperCase(),
          ret_period: this.retPeriod().trim(),
          api_name: SECTION_API,
        }),
      );

      this.rawResponse.set(raw);

      if (!isGstr1DownloadSuccessEnvelope(raw)) {
        const st =
          raw && typeof raw === 'object' && 'status' in (raw as object)
            ? String((raw as Record<string, unknown>)['status'])
            : '?';
        let msg = `Download did not return success (status = ${st}).`;
        if (
          raw &&
          typeof raw === 'object' &&
          'message' in (raw as object) &&
          typeof (raw as { message?: unknown }).message === 'string'
        ) {
          msg = (raw as { message: string }).message;
        }
        this.logicalErrorText.set(msg);
        this.viewState.set('error');
        return;
      }

      const bucket = extractGstr1DownloadMessageArray(raw, SECTION_API);
      const normalized = normalizeCdnurRecordsForHierarchy(bucket);
      const tree = parseGstr1DownloadHierarchy(normalized);
      const flat = flattenGstr1DownloadHierarchy(tree);
      this.hierarchy.set(tree);

      if (bucket.length === 0 || flat.length === 0) {
        this.viewState.set('empty');
      } else {
        this.viewState.set('success');
      }
      this.lastSyncedAt.set(new Date());
    } catch (err: unknown) {
      this.httpError.set(normalizeErrorEnvelope(err));
      this.viewState.set('error');
    } finally {
      this.loading.set(false);
    }
  }

  formatMoney(n: number): string {
    return this.moneyFmt.format(n);
  }

  formatSynced(d: Date | null): string {
    if (!d) {
      return '—';
    }
    return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  }

  async submitGstr1aRetsave(): Promise<void> {
    if (!this.canSubmitGstr1aRetsave()) {
      return;
    }
    const raw = this.rawResponse();
    const section = this.getRetsaveSectionForApi(raw, SECTION_API);
    if (section === null || !isGstr1DownloadSuccessEnvelope(raw)) {
      return;
    }

    const msg = raw.message as Record<string, unknown>;
    const gt =
      typeof msg['gt'] === 'number' ? msg['gt'] : this.sumCdnurNoteValues(section);
    const curGt = typeof msg['cur_gt'] === 'number' ? msg['cur_gt'] : gt;

    const body: Record<string, unknown> = {
      fp: this.retPeriod().trim(),
      gstin: this.gstin().trim().toUpperCase(),
      gt,
      cur_gt: curGt,
      cdnur: section,
    };

    this.retsaveSubmitting.set(true);
    this.retsaveError.set(null);
    this.retsaveSuccessPayload.set(null);
    try {
      const res = await firstValueFrom(this.api.retsaveGstr1aReturn(body));
      this.retsaveSuccessPayload.set(res);
    } catch (err: unknown) {
      this.retsaveError.set(normalizeErrorEnvelope(err));
    } finally {
      this.retsaveSubmitting.set(false);
    }
  }

  private getRetsaveSectionForApi(
    raw: unknown,
    apiName: Gstr1aDownloadApiName,
  ): unknown | null {
    if (!isGstr1DownloadSuccessEnvelope(raw)) {
      return null;
    }
    const msg = raw.message as Record<string, unknown>;
    const bucket = msg[apiName];
    if (bucket === undefined || bucket === null) {
      return null;
    }
    if (Array.isArray(bucket)) {
      return bucket.length > 0 ? bucket : null;
    }
    if (typeof bucket === 'object') {
      return Object.keys(bucket as object).length > 0 ? bucket : null;
    }
    return null;
  }

  private sumCdnurNoteValues(section: unknown): number {
    if (!Array.isArray(section)) {
      return 0;
    }
    let s = 0;
    for (const n of section) {
      if (n && typeof n === 'object') {
        s += num((n as Record<string, unknown>)['val']);
      }
    }
    return s;
  }

  async copyJson(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const raw = this.rawResponse();
    if (raw === null || raw === undefined) {
      return;
    }
    await navigator.clipboard.writeText(JSON.stringify(raw, null, 2));
  }

  downloadJson(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const raw = this.rawResponse();
    if (raw === null || raw === undefined) {
      return;
    }
    const blob = new Blob([JSON.stringify(raw, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gstr1a-cdnur-${this.gstin()}-${this.retPeriod()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
