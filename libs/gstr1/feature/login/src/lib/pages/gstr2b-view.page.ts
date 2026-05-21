import { isPlatformBrowser, JsonPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  HostListener,
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
  GSTR2B_CP_TABLE_OPTIONS,
  GSTR2B_DOCUMENT_TABLE_COLUMNS,
  GSTR2B_INVOICE_TYPE_FILTER_OPTIONS,
  GSTR2B_ITC_TAB_ADVISORIES,
  GSTR2B_ITC_TAB_LABELS,
  GSTR2B_ITC_TABS,
  gstr2bFormatSummaryAmount,
  GSTR2B_RECORDS_PER_PAGE_OPTIONS,
  GSTR2B_SUPPLIER_TABLE_COLUMNS,
  GSTR2B_TAX_RATE_FILTER_OPTIONS,
  GSTR2B_YES_NO_FILTER_OPTIONS,
  gstr22bLogicalError,
  gstr2bCpSummRowsForTable,
  gstr2bDefaultDocumentColumnVisibility,
  gstr2bDocRowsForTable,
  gstr2bSummaryRowsForTab,
  parseGstr2bBundle,
  RETURN_PERIOD_REGEX,
  type Gstr2bAllTablesSubTab,
  type Gstr2bBundle,
  type Gstr2bCpSummRow,
  type Gstr2bDocRow,
  type Gstr2bItcTab,
  type Gstr2bMainTab,
  type Gstr2bSummaryRow,
} from '@ramsoft-builder/gstr1/data-access/gstzen-auth';
import { catchError, firstValueFrom, of, switchMap } from 'rxjs';
import {
  indianFyLabelFromMmYyyy,
  monthNameFromMmYyyy,
  pickProfileString,
} from '../utils/gstr2a-period-labels';

type ViewState = 'idle' | 'loading' | 'success' | 'empty' | 'error';

export interface Gstr2bDocFilters {
  readonly invoiceDateFrom: string;
  readonly invoiceDateTo: string;
  readonly invoiceType: string;
  readonly reverseCharge: string;
  readonly gstr1FilingDateFrom: string;
  readonly gstr1FilingDateTo: string;
  readonly itcAvailability: string;
  readonly taxRatePercent: string;
}

const EMPTY_DOC_FILTERS: Gstr2bDocFilters = {
  invoiceDateFrom: '',
  invoiceDateTo: '',
  invoiceType: '',
  reverseCharge: '',
  gstr1FilingDateFrom: '',
  gstr1FilingDateTo: '',
  itcAvailability: '',
  taxRatePercent: '',
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

function parseDdMmYyyy(value: string): number | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  if (!m) {
    return null;
  }
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

function formatAmountDisplay(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '—';
  }
  const n = Number.parseFloat(trimmed.replace(/,/g, ''));
  if (!Number.isFinite(n)) {
    return trimmed;
  }
  return n.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function rowMatchesDateRange(
  cellDate: string,
  from: string,
  to: string,
): boolean {
  const cellTs = parseDdMmYyyy(cellDate);
  if (cellTs === null) {
    return !from.trim() && !to.trim();
  }
  const fromTs = parseDdMmYyyy(from);
  const toTs = parseDdMmYyyy(to);
  if (fromTs !== null && cellTs < fromTs) {
    return false;
  }
  if (toTs !== null && cellTs > toTs) {
    return false;
  }
  return true;
}

@Component({
  selector: 'lib-gstr2b-view-page',
  standalone: true,
  imports: [JsonPipe, RouterLink],
  templateUrl: './gstr2b-view.page.html',
  styleUrl: './gstr2b-view.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-[60vh]' },
})
export class Gstr2bViewPageComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(Gstr1GstnOtpApiService);
  private readonly authStore = inject(AuthStore);
  private readonly userProfile = inject(UserProfileRepository);

  readonly itcTabs = GSTR2B_ITC_TABS;
  readonly itcTabLabels = GSTR2B_ITC_TAB_LABELS;
  readonly cpTableOptions = GSTR2B_CP_TABLE_OPTIONS;
  readonly supplierColumns = GSTR2B_SUPPLIER_TABLE_COLUMNS;
  readonly documentColumns = GSTR2B_DOCUMENT_TABLE_COLUMNS;
  readonly recordsPerPageOptions = GSTR2B_RECORDS_PER_PAGE_OPTIONS;
  readonly invoiceTypeFilterOptions = GSTR2B_INVOICE_TYPE_FILTER_OPTIONS;
  readonly yesNoFilterOptions = GSTR2B_YES_NO_FILTER_OPTIONS;
  readonly taxRateFilterOptions = GSTR2B_TAX_RATE_FILTER_OPTIONS;

  readonly gstin = signal('');
  readonly retPeriod = signal('');
  readonly filingLabel = signal('');
  readonly legalName = signal('');
  readonly tradeName = signal('');
  readonly generationDate = signal('');

  readonly mainTab = signal<Gstr2bMainTab>('summary');
  readonly itcTab = signal<Gstr2bItcTab>('itcavl');
  readonly allTablesSubTab = signal<Gstr2bAllTablesSubTab>('supplier');
  readonly selectedCpTable = signal(GSTR2B_CP_TABLE_OPTIONS[0]?.id ?? 'b2b');
  readonly expandedRowIds = signal<ReadonlySet<string>>(new Set());
  readonly allExpanded = signal(true);

  readonly searchQuery = signal('');
  readonly recordsPerPage = signal(10);
  readonly currentPage = signal(1);
  readonly columnPickerOpen = signal(false);
  readonly columnVisibility = signal<Record<string, boolean>>(
    gstr2bDefaultDocumentColumnVisibility(),
  );
  readonly filterModalOpen = signal(false);
  readonly appliedDocFilters = signal<Gstr2bDocFilters>(EMPTY_DOC_FILTERS);
  readonly draftDocFilters = signal<Gstr2bDocFilters>(EMPTY_DOC_FILTERS);

  readonly bundle = signal<Gstr2bBundle | null>(null);
  readonly viewState = signal<ViewState>('idle');
  readonly logicalError = signal<string | null>(null);
  readonly httpError = signal<unknown>(null);

  readonly fyLabel = computed(() => indianFyLabelFromMmYyyy(this.retPeriod()));
  readonly taxPeriodLabel = computed(() => monthNameFromMmYyyy(this.retPeriod()));

  readonly paramsValid = computed(() => {
    const g = this.gstin().trim();
    const r = this.retPeriod().trim();
    return g.length === 15 && RETURN_PERIOD_REGEX.test(r);
  });

  readonly selectedTableLabel = computed(() => {
    const opt = this.cpTableOptions.find((o) => o.id === this.selectedCpTable());
    return opt?.label ?? 'Select table to view details';
  });

  readonly summaryRows = computed((): readonly Gstr2bSummaryRow[] => {
    const b = this.bundle();
    if (!b) {
      return [];
    }
    return gstr2bSummaryRowsForTab(b, this.itcTab());
  });

  readonly visibleSummaryRows = computed(() => {
    const expanded = this.expandedRowIds();
    const rows = this.summaryRows();
    const byId = new Map(rows.map((r) => [r.id, r]));

    const isVisible = (row: Gstr2bSummaryRow): boolean => {
      let pid = row.parentId;
      while (pid) {
        const parent = byId.get(pid);
        if (!parent) {
          break;
        }
        // Part headers are not expandable; only hide leaves when a group is collapsed.
        if (parent.isExpandable && !expanded.has(pid)) {
          return false;
        }
        pid = parent.parentId;
      }
      return true;
    };

    return rows.filter(isVisible);
  });

  readonly cpRows = computed((): readonly Gstr2bCpSummRow[] => {
    const b = this.bundle();
    if (!b) {
      return [];
    }
    const opt = this.cpTableOptions.find((o) => o.id === this.selectedCpTable());
    if (!opt) {
      return [];
    }
    return gstr2bCpSummRowsForTable(b, opt.cpSummKey);
  });

  readonly docRows = computed((): readonly Gstr2bDocRow[] => {
    const b = this.bundle();
    if (!b) {
      return [];
    }
    const opt = this.cpTableOptions.find((o) => o.id === this.selectedCpTable());
    if (!opt) {
      return [];
    }
    return gstr2bDocRowsForTable(b, opt.cpSummKey);
  });

  readonly filteredCpRows = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const rows = this.cpRows();
    if (!q) {
      return rows;
    }
    return rows.filter(
      (row) =>
        row.supplierGstin.toLowerCase().includes(q) ||
        row.tradeName.toLowerCase().includes(q),
    );
  });

  readonly filteredDocRows = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const filters = this.appliedDocFilters();
    return this.docRows().filter((row) => {
      if (q) {
        const hay = [
          row.supplierGstin,
          row.tradeName,
          row.invoiceNumber,
          row.invoiceType,
          row.placeOfSupply,
          row.source,
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) {
          return false;
        }
      }
      if (
        filters.invoiceType &&
        row.invoiceTypeCode !== filters.invoiceType.toUpperCase()
      ) {
        return false;
      }
      if (
        filters.reverseCharge &&
        row.reverseChargeCode !== filters.reverseCharge.toUpperCase()
      ) {
        return false;
      }
      if (
        filters.itcAvailability &&
        row.itcAvailabilityCode !== filters.itcAvailability.toUpperCase()
      ) {
        return false;
      }
      if (filters.taxRatePercent && row.taxRatePercent !== filters.taxRatePercent) {
        return false;
      }
      if (
        !rowMatchesDateRange(
          row.invoiceDate,
          filters.invoiceDateFrom,
          filters.invoiceDateTo,
        )
      ) {
        return false;
      }
      if (
        !rowMatchesDateRange(
          row.gstr1FilingDate,
          filters.gstr1FilingDateFrom,
          filters.gstr1FilingDateTo,
        )
      ) {
        return false;
      }
      return true;
    });
  });

  readonly activeAllTablesRows = computed(() =>
    this.allTablesSubTab() === 'supplier'
      ? this.filteredCpRows()
      : this.filteredDocRows(),
  );

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.activeAllTablesRows().length / this.recordsPerPage())),
  );

  readonly paginatedCpRows = computed(() => {
    const start = (this.currentPage() - 1) * this.recordsPerPage();
    return this.filteredCpRows().slice(start, start + this.recordsPerPage());
  });

  readonly paginatedDocRows = computed(() => {
    const start = (this.currentPage() - 1) * this.recordsPerPage();
    return this.filteredDocRows().slice(start, start + this.recordsPerPage());
  });

  readonly visibleDocumentColumns = computed(() =>
    this.documentColumns.filter((col) => this.isDocumentColumnVisible(col.id)),
  );

  readonly hiddenDocumentColumnCount = computed(() =>
    this.documentColumns.filter((col) => !this.isDocumentColumnVisible(col.id)).length,
  );

  readonly hasSummaryTable = computed(
    () => this.viewState() === 'success' && this.visibleSummaryRows().length > 0,
  );

  readonly hasCpTable = computed(
    () => this.viewState() === 'success' && this.cpRows().length > 0,
  );

  readonly hasDocTable = computed(
    () => this.viewState() === 'success' && this.docRows().length > 0,
  );

  readonly backToDashboardQueryParams = computed(() => ({
    gstin: this.gstin().trim().toUpperCase(),
    ret_period: this.retPeriod().trim(),
    filing_status: this.filingLabel().trim() || undefined,
  }));

  readonly activeItcTabAdvisory = computed(
    () => GSTR2B_ITC_TAB_ADVISORIES[this.itcTab()] ?? null,
  );

  readonly activeItcTabClass = computed(() => {
    const t = this.itcTab();
    if (t === 'itcavl') {
      return 'gstr2b-itc-tab--active-avl';
    }
    if (t === 'itcunavl') {
      return 'gstr2b-itc-tab--active-unavl';
    }
    if (t === 'itcrev') {
      return 'gstr2b-itc-tab--active-rev';
    }
    return 'gstr2b-itc-tab--active-rej';
  });

  constructor() {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((q) => {
        const g = (q.get('gstin') ?? '').trim().toUpperCase();
        const r = (q.get('ret_period') ?? '').trim();
        const fl = (q.get('filing_status') ?? '').trim();
        if (g) {
          this.gstin.set(g);
        }
        if (r) {
          this.retPeriod.set(r);
        }
        if (fl) {
          this.filingLabel.set(fl);
        }
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
            'legal_name',
            'legalName',
            'LegalName',
            'companyName',
            'CompanyName',
            'name',
          ]),
        );
        this.tradeName.set(
          pickProfileString(p, ['tradeName', 'TradeName', 'trade_name', 'dba']),
        );
      });

    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) {
        return;
      }
      void this.loadGstr2b();
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.columnPickerOpen()) {
      return;
    }
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    if (!target.closest('[data-gstr2b-column-picker]')) {
      this.columnPickerOpen.set(false);
    }
  }

  setItcTab(tab: Gstr2bItcTab): void {
    this.itcTab.set(tab);
    this.refreshExpandedIds();
    this.allExpanded.set(true);
  }

  setMainTab(tab: Gstr2bMainTab): void {
    this.mainTab.set(tab);
    if (tab === 'summary' && this.viewState() === 'success') {
      this.refreshExpandedIds();
      this.allExpanded.set(true);
    }
  }

  setAllTablesSubTab(tab: Gstr2bAllTablesSubTab): void {
    this.allTablesSubTab.set(tab);
    this.searchQuery.set('');
    this.currentPage.set(1);
    this.columnPickerOpen.set(false);
  }

  setCpTable(id: string): void {
    this.selectedCpTable.set(id);
    this.currentPage.set(1);
    this.searchQuery.set('');
  }

  setRecordsPerPage(value: string): void {
    const n = Number.parseInt(value, 10);
    this.recordsPerPage.set(Number.isFinite(n) && n > 0 ? n : 10);
    this.currentPage.set(1);
  }

  updateSearch(value: string): void {
    this.searchQuery.set(value);
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    const clamped = Math.min(Math.max(1, page), this.totalPages());
    this.currentPage.set(clamped);
  }

  toggleExpandAll(): void {
    if (this.allExpanded()) {
      this.expandedRowIds.set(new Set());
      this.allExpanded.set(false);
      return;
    }
    this.refreshExpandedIds();
    this.allExpanded.set(true);
  }

  toggleRow(row: Gstr2bSummaryRow): void {
    if (!row.isExpandable) {
      return;
    }
    const next = new Set(this.expandedRowIds());
    if (next.has(row.id)) {
      next.delete(row.id);
    } else {
      next.add(row.id);
    }
    this.expandedRowIds.set(next);
    this.allExpanded.set(
      this.summaryRows()
        .filter((r) => r.isExpandable)
        .every((r) => next.has(r.id)),
    );
  }

  rowExpanded(row: Gstr2bSummaryRow): boolean {
    return !row.isExpandable || this.expandedRowIds().has(row.id);
  }

  rowDepthClass(row: Gstr2bSummaryRow): string {
    if (row.isPartHeader) {
      return 'gstr2b-part-row';
    }
    if (row.depth === 2) {
      return 'gstr2b-depth-2';
    }
    return '';
  }

  toggleColumnPicker(): void {
    this.columnPickerOpen.update((open) => !open);
  }

  isDocumentColumnVisible(columnId: string): boolean {
    const col = this.documentColumns.find((c) => c.id === columnId);
    if (col?.locked) {
      return true;
    }
    return this.columnVisibility()[columnId] !== false;
  }

  toggleDocumentColumn(columnId: string): void {
    const col = this.documentColumns.find((c) => c.id === columnId);
    if (col?.locked) {
      return;
    }
    this.columnVisibility.update((m) => ({
      ...m,
      [columnId]: !this.isDocumentColumnVisible(columnId),
    }));
  }

  selectAllDocumentColumns(): void {
    const out: Record<string, boolean> = {};
    for (const col of this.documentColumns) {
      out[col.id] = true;
    }
    this.columnVisibility.set(out);
  }

  deselectAllDocumentColumns(): void {
    const out: Record<string, boolean> = {};
    for (const col of this.documentColumns) {
      out[col.id] = !!col.locked;
    }
    this.columnVisibility.set(out);
  }

  openFilterModal(): void {
    this.draftDocFilters.set({ ...this.appliedDocFilters() });
    this.filterModalOpen.set(true);
  }

  closeFilterModal(): void {
    this.filterModalOpen.set(false);
  }

  updateDraftFilter<K extends keyof Gstr2bDocFilters>(
    key: K,
    value: Gstr2bDocFilters[K],
  ): void {
    this.draftDocFilters.update((f) => ({ ...f, [key]: value }));
  }

  resetDocFilters(): void {
    this.draftDocFilters.set(EMPTY_DOC_FILTERS);
  }

  applyDocFilters(): void {
    this.appliedDocFilters.set({ ...this.draftDocFilters() });
    this.currentPage.set(1);
    this.filterModalOpen.set(false);
  }

  cpCellValue(row: Gstr2bCpSummRow, field: keyof Gstr2bCpSummRow): string {
    const raw = String(row[field] ?? '').trim();
    if (!raw) {
      return '—';
    }
    if (
      field === 'taxableValue' ||
      field === 'integratedTax' ||
      field === 'centralTax' ||
      field === 'stateTax' ||
      field === 'cess'
    ) {
      return formatAmountDisplay(raw);
    }
    return raw;
  }

  docCellValue(row: Gstr2bDocRow, field: keyof Gstr2bDocRow): string {
    const raw = String(row[field] ?? '').trim();
    if (!raw) {
      return '—';
    }
    if (
      field === 'invoiceValue' ||
      field === 'taxableValue' ||
      field === 'integratedTax' ||
      field === 'centralTax' ||
      field === 'stateTax' ||
      field === 'cess'
    ) {
      return formatAmountDisplay(raw);
    }
    return raw;
  }

  cpRowSerial(index: number): number {
    return (this.currentPage() - 1) * this.recordsPerPage() + index + 1;
  }

  trackCpRow(row: Gstr2bCpSummRow, index: number): string {
    return `${row.supplierGstin}|${row.tradeName}|${index}`;
  }

  trackDocRow(row: Gstr2bDocRow, index: number): string {
    return `${row.supplierGstin}|${row.invoiceNumber}|${row.invoiceDate}|${index}`;
  }

  summaryTaxDisplay(
    row: Gstr2bSummaryRow,
    field: 'igst' | 'cgst' | 'sgst' | 'cess',
  ): string {
    if (row.isPartHeader) {
      return '';
    }
    return gstr2bFormatSummaryAmount(row[field]);
  }

  expandToggleLabel(row: Gstr2bSummaryRow): string {
    return this.rowExpanded(row) ? '^' : '▶';
  }

  openGstHelp(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    window.open('https://www.gst.gov.in/', '_blank', 'noopener,noreferrer');
  }

  openGstr3b(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    window.open('https://www.gst.gov.in/', '_blank', 'noopener,noreferrer');
  }

  openImsDashboard(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    window.open('https://www.gst.gov.in/', '_blank', 'noopener,noreferrer');
  }

  async loadGstr2b(): Promise<void> {
    if (!this.paramsValid() || this.viewState() === 'loading') {
      return;
    }
    const gstin = this.gstin().trim().toUpperCase();
    const ret_period = this.retPeriod().trim();

    this.viewState.set('loading');
    this.logicalError.set(null);
    this.httpError.set(null);
    this.bundle.set(null);

    try {
      const payload = await firstValueFrom(
        this.api.fetchGstr22b({ gstin, ret_period }),
      );
      const topErr = gstr22bLogicalError(payload);
      if (topErr) {
        this.logicalError.set(topErr);
        this.viewState.set('error');
        return;
      }
      const parsed = parseGstr2bBundle(payload);
      if (!parsed) {
        this.logicalError.set('Unexpected response from GSTR-2B.');
        this.viewState.set('error');
        return;
      }
      this.bundle.set(parsed);
      this.generationDate.set(parsed.header.generationDate || '—');
      this.refreshExpandedIds();
      this.allExpanded.set(true);
      this.viewState.set('success');
    } catch (err: unknown) {
      this.httpError.set(normalizeErrorEnvelope(err));
      this.viewState.set('error');
    }
  }

  private refreshExpandedIds(): void {
    const ids = this.summaryRows()
      .filter((r) => r.isExpandable)
      .map((r) => r.id);
    this.expandedRowIds.set(new Set(ids));
  }
}
