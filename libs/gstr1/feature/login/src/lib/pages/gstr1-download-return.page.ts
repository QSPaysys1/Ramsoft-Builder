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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import {
  Gstr1GstnOtpApiService,
  GSTR1_DOWNLOAD_API_NAMES,
  RETURN_PERIOD_REGEX,
  aggregateGstr1DownloadRows,
  coerceGstr1DownloadApiName,
  extractGstr1DownloadMessageArray,
  filterGstr1DownloadHierarchy,
  flattenGstr1DownloadHierarchy,
  isGstr1DownloadSuccessEnvelope,
  parseGstr1DownloadHierarchy,
  type Gstr1DownloadAggregateStats,
  type Gstr1DownloadApiName,
  type Gstr1DownloadCtinGroup,
} from '@ramsoft-builder/gstr1/data-access/gstzen-auth';
import { filter } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';

type ViewState = 'idle' | 'loading' | 'success' | 'empty' | 'error';

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

@Component({
  selector: 'lib-gstr1-download-return-page',
  standalone: true,
  imports: [JsonPipe, RouterLink],
  templateUrl: './gstr1-download-return.page.html',
  styleUrl: './gstr1-download-return.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-[60vh]' },
})
export class Gstr1DownloadReturnPageComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(Gstr1GstnOtpApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly apiNameOptions = GSTR1_DOWNLOAD_API_NAMES;

  readonly gstin = signal('');
  readonly retPeriod = signal('');
  readonly apiName = signal<Gstr1DownloadApiName>('b2b');

  readonly filterQuery = signal('');

  readonly viewState = signal<ViewState>('idle');
  readonly loading = signal(false);
  readonly httpError = signal<unknown>(null);
  readonly rawResponse = signal<unknown>(null);
  readonly logicalErrorText = signal<string | null>(null);
  readonly lastSyncedAt = signal<Date | null>(null);

  readonly hierarchy = signal<readonly Gstr1DownloadCtinGroup[]>([]);
  readonly aggregate = signal<Gstr1DownloadAggregateStats | null>(null);

  readonly expandedCtins = signal(new Set<string>());
  readonly expandedInvoices = signal(new Set<string>());

  readonly filteredHierarchy = computed(() =>
    filterGstr1DownloadHierarchy([...this.hierarchy()], this.filterQuery()),
  );

  /** True when every filtered CTIN and every invoice under it shows its line-detail table. */
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
    const a = coerceGstr1DownloadApiName(q.get('api_name'));
    if (g) {
      this.gstin.set(g);
    }
    if (r) {
      this.retPeriod.set(r);
    }
    this.apiName.set(a);
  }

  updateGstin(value: string): void {
    this.gstin.set(value.trim().toUpperCase());
  }

  updateRetPeriod(value: string): void {
    this.retPeriod.set(value.trim());
  }

  updateApiName(value: string): void {
    this.apiName.set(coerceGstr1DownloadApiName(value));
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
      this.syncUrlFromForm();

      const raw = await firstValueFrom(
        this.api.downloadGstr1Return({
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
      /** Open CTIN panels so invoices are visible; line tables stay closed until Expand all or row tap. */
      this.expandedCtins.set(new Set(tree.map((g) => g.ctin)));
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

  /** One control: collapse when fully expanded, otherwise expand every CTIN and invoice panel. */
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
    a.download = `gstr1-${this.apiName()}-${this.gstin()}-${this.retPeriod()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  syncUrlFromForm(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        gstin: this.gstin().trim().toUpperCase() || undefined,
        ret_period: this.retPeriod().trim() || undefined,
        api_name: this.apiName(),
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
