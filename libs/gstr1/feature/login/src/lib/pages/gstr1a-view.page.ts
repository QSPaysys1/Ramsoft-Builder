import { isPlatformBrowser, JsonPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { AuthStore } from '@ramsoft-builder/auth/data-access/auth';
import { UserProfileRepository } from '@ramsoft-builder/e-invoices/data-access/einvoice';
import {
  Gstr1GstnOtpApiService,
  GSTR1A_DOWNLOAD_API_OPTIONS,
  RETURN_PERIOD_REGEX,
  aggregateGstr1DownloadRows,
  coerceGstr1aDownloadApiName,
  extractGstr1DownloadMessageArray,
  filterGstr1DownloadHierarchy,
  flattenGstr1DownloadHierarchy,
  isGstr1DownloadSuccessEnvelope,
  parseGstr1DownloadHierarchy,
  type Gstr1DownloadAggregateStats,
  type Gstr1DownloadCtinGroup,
  type Gstr1aDownloadApiName,
} from '@ramsoft-builder/gstr1/data-access/gstzen-auth';
import { filter } from 'rxjs/operators';
import { catchError, firstValueFrom, of, switchMap } from 'rxjs';

type ViewState = 'idle' | 'loading' | 'success' | 'empty' | 'error';

export const GSTR1A_SUMMARY_SECTION_TITLES: readonly string[] = [
  '4A, 4B, 6B, 6C - B2B, SEZ, DE Invoices',
  '5 - B2C (Large) Invoices',
  '6A - Exports Invoices',
  '7 - B2C (Others)',
  '8A, 8B, 8C, 8D - Nil Rated Supplies',
  '9B - Credit / Debit Notes (Registered)',
  '9B - Credit / Debit Notes (Unregistered)',
  '11A(1), 11A(2) - Tax Liability (Advances Received)',
  '11B(1), 11B(2) - Adjustment of Advances',
  '12 - HSN-wise summary of outward supplies',
  '13 - Documents Issued',
  '14 - Supplies made through ECO',
  '15 - Supplies U/s 9(5)',
];

/**
 * Maps GSTZen `api_name` to summary tile indexes in {@link GSTR1A_SUMMARY_SECTION_TITLES}.
 * Indexes with no mapped section (`retsum`, documents table) rely on totals only.
 */
const GSTR1A_SUMMARY_TILES_FOR_API: Readonly<
  Partial<Record<Gstr1aDownloadApiName, readonly number[]>>
> = {
  b2b: [0],
  b2ba: [0],
  b2cl: [1],
  b2cla: [1],
  exp: [2],
  expa: [2],
  b2cs: [3],
  b2csa: [3],
  nil: [4],
  cdnr: [5],
  cdnra: [5],
  cdnur: [6],
  cdnura: [6],
  at: [7],
  ata: [7],
  txp: [8],
  txpa: [8],
  hsnsum: [9],
  ecom: [11],
  ecoma: [11],
  supeco: [12],
  supecoa: [12],
};

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

@Component({
  selector: 'lib-gstr1a-view-page',
  standalone: true,
  imports: [JsonPipe, RouterLink],
  templateUrl: './gstr1a-view.page.html',
  styleUrl: './gstr1a-view.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-[60vh]' },
})
export class Gstr1aViewPageComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(Gstr1GstnOtpApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authStore = inject(AuthStore);
  private readonly userProfile = inject(UserProfileRepository);

  readonly summaryTitles = GSTR1A_SUMMARY_SECTION_TITLES;
  readonly apiOptions = GSTR1A_DOWNLOAD_API_OPTIONS;

  readonly gstin = signal('');
  readonly retPeriod = signal('');
  readonly apiName = signal<Gstr1aDownloadApiName>('b2b');
  /** Filing posture label when navigating from Returns dashboard. */
  readonly filingLabel = signal<string>('');

  readonly filterQuery = signal('');

  readonly viewState = signal<ViewState>('idle');
  readonly loading = signal(false);
  readonly httpError = signal<unknown>(null);
  readonly logicalErrorText = signal<string | null>(null);
  readonly rawResponse = signal<unknown>(null);
  readonly lastSyncedAt = signal<Date | null>(null);

  readonly legalName = signal('');
  readonly tradeName = signal('');

  readonly hierarchy = signal<readonly Gstr1DownloadCtinGroup[]>([]);
  readonly aggregate = signal<Gstr1DownloadAggregateStats | null>(null);

  readonly expandedCtins = signal(new Set<string>());
  readonly expandedInvoices = signal(new Set<string>());

  readonly addRecordOpen = signal(true);
  readonly amendRecordOpen = signal(false);

  readonly filteredHierarchy = computed(() =>
    filterGstr1DownloadHierarchy([...this.hierarchy()], this.filterQuery()),
  );

  readonly summaryCounts = computed(() => {
    const out = this.summaryTitles.map(() => 0);
    const agg = this.aggregate();
    const st = this.viewState();
    if ((st === 'success' || st === 'empty') && agg) {
      const indices = GSTR1A_SUMMARY_TILES_FOR_API[this.apiName()];
      if (indices?.length) {
        for (const i of indices) {
          out[i] = agg.invoiceCount;
        }
      }
    }
    return out;
  });

  readonly selectedApiHint = computed(() => {
    const a = this.apiName();
    return GSTR1A_DOWNLOAD_API_OPTIONS.find((x) => x.value === a)?.description ?? '';
  });

  readonly fyLabel = computed(() => indianFyLabelFromMmYyyy(this.retPeriod().trim()));
  readonly taxPeriodLabel = computed(() => monthNameFromMmYyyy(this.retPeriod().trim()));

  readonly accordionFullyExpanded = computed(() => {
    const groups = this.filteredHierarchy();
    if (groups.length === 0) {
      return false;
    }
    const ctins = this.expandedCtins();
    const invoices = this.expandedInvoices();
    for (const g of groups) {
      if (!ctins.has(g.ctin)) {
        return false;
      }
      for (const inv of g.invoices) {
        const id = `${g.ctin}||${inv.invoiceKey}`;
        if (!invoices.has(id)) {
          return false;
        }
      }
    }
    return true;
  });

  readonly moneyFmt = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  constructor() {
    this.syncQueryIntoSignals(this.route.snapshot.queryParamMap);

    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.syncQueryIntoSignals(this.route.snapshot.queryParamMap);
      });

    toObservable(this.authStore.user)
      .pipe(
        switchMap((user) => {
          if (!user?.id) {
            return of(undefined);
          }
          return this.userProfile.watchProfileData(user.id).pipe(
            catchError(() => of(undefined)),
          );
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

    afterNextRender(() => {
      const runAutoFetch = (): void => {
        const g = this.gstin().trim().toUpperCase();
        const r = this.retPeriod().trim();
        if (RETURN_PERIOD_REGEX.test(r) && g.length === 15) {
          void this.fetchFromApi();
        }
      };
      runAutoFetch();
    });
  }

  private syncQueryIntoSignals(q: { get: (k: string) => string | null }): void {
    const g = (q.get('gstin') ?? '').trim().toUpperCase();
    const r = (q.get('ret_period') ?? '').trim();
    const a = coerceGstr1aDownloadApiName(q.get('api_name'));
    const fl = (q.get('filing_status') ?? '').trim();
    if (g) {
      this.gstin.set(g);
    }
    if (r) {
      this.retPeriod.set(r);
    }
    this.apiName.set(a);
    if (fl) {
      this.filingLabel.set(fl);
    }
  }

  updateGstin(value: string): void {
    this.gstin.set(value.trim().toUpperCase());
  }

  updateRetPeriod(value: string): void {
    this.retPeriod.set(value.trim());
  }

  updateApiName(value: string): void {
    this.apiName.set(coerceGstr1aDownloadApiName(value));
  }

  summaryTileActive(index: number): boolean {
    const indices = GSTR1A_SUMMARY_TILES_FOR_API[this.apiName()];
    return indices?.includes(index) ?? false;
  }

  toggleAddSection(): void {
    this.addRecordOpen.update((v) => !v);
  }

  toggleAmendSection(): void {
    this.amendRecordOpen.update((v) => !v);
  }

  paramsValid(): boolean {
    const g = this.gstin().trim();
    const r = this.retPeriod().trim();
    return g.length === 15 && RETURN_PERIOD_REGEX.test(r);
  }

  async fetchFromApi(): Promise<void> {
    if (this.loading()) {
      return;
    }
    if (!this.paramsValid()) {
      this.logicalErrorText.set('Enter a valid 15-character GSTIN and return period (MMYYYY).');
      this.httpError.set(null);
      this.viewState.set('error');
      return;
    }

    this.loading.set(true);
    this.viewState.set('loading');
    this.httpError.set(null);
    this.logicalErrorText.set(null);
    this.hierarchy.set([]);
    this.aggregate.set(null);

    try {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {
          gstin: this.gstin().trim().toUpperCase() || undefined,
          ret_period: this.retPeriod().trim() || undefined,
          api_name: this.apiName(),
          filing_status: this.filingLabel().trim() || undefined,
        },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });

      const raw = await firstValueFrom(
        this.api.downloadGstr1aReturn({
          gstin: this.gstin().trim().toUpperCase(),
          ret_period: this.retPeriod().trim(),
          api_name: this.apiName(),
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

      const bucket = extractGstr1DownloadMessageArray(raw, this.apiName());
      if (bucket.length === 0) {
        this.hierarchy.set([]);
        this.aggregate.set({
          sourceBucketLength: 0,
          totalLineItems: 0,
          invoiceCount: 0,
          ctinCount: 0,
          taxableTotal: 0,
          igstTotal: 0,
          cgstTotal: 0,
          sgstTotal: 0,
          cessTotal: 0,
          taxGrandTotal: 0,
        });
        this.viewState.set('empty');
        this.lastSyncedAt.set(new Date());
        this.collapseAll();
        return;
      }

      const tree = parseGstr1DownloadHierarchy(bucket);
      const flat = flattenGstr1DownloadHierarchy(tree);
      const agg = aggregateGstr1DownloadRows(flat, bucket.length);

      this.hierarchy.set(tree);
      this.aggregate.set(agg);
      this.viewState.set('success');
      this.lastSyncedAt.set(new Date());
      this.expandedCtins.set(new Set(tree.map((x) => x.ctin)));
      this.expandedInvoices.set(new Set());
    } catch (err: unknown) {
      this.httpError.set(normalizeErrorEnvelope(err));
      this.viewState.set('error');
    } finally {
      this.loading.set(false);
    }
  }

  refresh(): void {
    void this.fetchFromApi();
  }

  invoiceExpandId(ctin: string, invoiceKey: string): string {
    return `${ctin}||${invoiceKey}`;
  }

  toggleCtin(ctin: string): void {
    const next = new Set(this.expandedCtins());
    if (next.has(ctin)) {
      next.delete(ctin);
    } else {
      next.add(ctin);
    }
    this.expandedCtins.set(next);
  }

  toggleInvoice(ctin: string, invoiceKey: string): void {
    const id = this.invoiceExpandId(ctin, invoiceKey);
    const next = new Set(this.expandedInvoices());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.expandedInvoices.set(next);
  }

  expandAll(): void {
    const groups = this.filteredHierarchy();
    const ctins = new Set(groups.map((g) => g.ctin));
    const inv = new Set<string>();
    for (const g of groups) {
      for (const i of g.invoices) {
        inv.add(this.invoiceExpandId(g.ctin, i.invoiceKey));
      }
    }
    this.expandedCtins.set(ctins);
    this.expandedInvoices.set(inv);
  }

  collapseAll(): void {
    this.expandedCtins.set(new Set());
    this.expandedInvoices.set(new Set());
  }

  toggleExpandCollapseAll(): void {
    if (this.accordionFullyExpanded()) {
      this.collapseAll();
    } else {
      this.expandAll();
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
    a.download = `gstr1a-${this.apiName()}-${this.gstin()}-${this.retPeriod()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
