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
  gstr2aTdsTcsRowKey,
  gstr2aTdsTcsRowsToCsv,
  RETURN_PERIOD_REGEX,
  type Gstr2aTdsTcsCreditRow,
  type Gstr2aTdsTcsSection,
} from '@ramsoft-builder/gstr1/data-access/gstzen-auth';
import { catchError, of, switchMap } from 'rxjs';
import {
  GSTR2A_TDS_TCS_PAGE_META,
  gstr2aTdsTcsColumnsForSection,
  type Gstr2aTdsTcsColumnDef,
} from '../constants/gstr2a-tds-tcs.constants';
import { Gstr2aTdsTcsCacheService } from '../services/gstr2a-tds-tcs-cache.service';
import {
  indianFyLabelFromMmYyyy,
  monthNameFromMmYyyy,
  pickProfileString,
} from '../utils/gstr2a-period-labels';

type ViewState = 'idle' | 'loading' | 'success' | 'empty' | 'error';

function isTdsTcsSection(v: unknown): v is Gstr2aTdsTcsSection {
  return v === 'tds' || v === 'tdsa' || v === 'tcs';
}

function defaultColumnVisibility(
  columns: readonly Gstr2aTdsTcsColumnDef[],
): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const col of columns) {
    out[col.id] = true;
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

@Component({
  selector: 'lib-gstr2a-tds-tcs-page',
  standalone: true,
  imports: [JsonPipe, RouterLink],
  templateUrl: './gstr2a-tds-tcs.page.html',
  styleUrl: './gstr2a-tds-tcs.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-[60vh]' },
})
export class Gstr2aTdsTcsPageComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  readonly tdsTcsCache = inject(Gstr2aTdsTcsCacheService);
  private readonly authStore = inject(AuthStore);
  private readonly userProfile = inject(UserProfileRepository);

  readonly section = signal<Gstr2aTdsTcsSection>(
    isTdsTcsSection(this.route.snapshot.data['tdsTcsSection'])
      ? this.route.snapshot.data['tdsTcsSection']
      : 'tds',
  );

  readonly gstin = signal('');
  readonly retPeriod = signal('');
  readonly filingLabel = signal('');
  readonly legalName = signal('');
  readonly tradeName = signal('');
  readonly searchQuery = signal('');
  readonly columnPickerOpen = signal(false);
  readonly emptyNoticeDismissed = signal(false);
  readonly columnVisibility = signal<Record<string, boolean>>({});

  readonly viewState = signal<ViewState>('idle');
  readonly httpError = signal<unknown>(null);

  readonly pageMeta = computed(() => GSTR2A_TDS_TCS_PAGE_META[this.section()]);
  readonly tableColumns = computed(() => gstr2aTdsTcsColumnsForSection(this.section()));

  readonly fyLabel = computed(() => indianFyLabelFromMmYyyy(this.retPeriod()));
  readonly taxPeriodLabel = computed(() => monthNameFromMmYyyy(this.retPeriod()));

  readonly paramsValid = computed(() => {
    const g = this.gstin().trim();
    const r = this.retPeriod().trim();
    return g.length === 15 && RETURN_PERIOD_REGEX.test(r);
  });

  readonly creditRows = computed((): readonly Gstr2aTdsTcsCreditRow[] => {
    const bundle = this.tdsTcsCache.bundle();
    if (!bundle) {
      return [];
    }
    return bundle[this.section()];
  });

  readonly filteredRows = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const rows = this.creditRows();
    if (!q) {
      return rows;
    }
    return rows.filter(
      (row) =>
        row.partyGstin.toLowerCase().includes(q) ||
        row.creditMonth.toLowerCase().includes(q) ||
        row.originalPeriod.toLowerCase().includes(q) ||
        row.amount.toLowerCase().includes(q) ||
        row.flag.toLowerCase().includes(q),
    );
  });

  readonly backToGstr2aQueryParams = computed(() => ({
    gstin: this.gstin().trim().toUpperCase(),
    ret_period: this.retPeriod().trim(),
    filing_status: this.filingLabel().trim() || undefined,
  }));

  readonly visibleColumns = computed(() =>
    this.tableColumns().filter((col) => this.isColumnVisible(col.id)),
  );

  readonly showEmptyNotice = computed(
    () =>
      this.viewState() === 'empty' &&
      !this.emptyNoticeDismissed() &&
      this.filteredRows().length === 0,
  );

  readonly hasRecords = computed(
    () => this.viewState() === 'success' && this.creditRows().length > 0,
  );

  constructor() {
    this.columnVisibility.set(
      defaultColumnVisibility(gstr2aTdsTcsColumnsForSection(this.section())),
    );

    this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
      const s = data['tdsTcsSection'];
      if (isTdsTcsSection(s) && s !== this.section()) {
        this.section.set(s);
        this.resetColumnVisibility();
        this.searchQuery.set('');
        if (this.paramsValid() && isPlatformBrowser(this.platformId)) {
          void this.loadCredits();
        }
      }
    });

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
      void this.loadCredits();
    });
  }

  private resetColumnVisibility(): void {
    this.columnVisibility.set(defaultColumnVisibility(this.tableColumns()));
  }

  trackRow(row: Gstr2aTdsTcsCreditRow): string {
    return gstr2aTdsTcsRowKey(row);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.columnPickerOpen()) {
      return;
    }
    const target = event.target;
    if (!(target instanceof Element) || !target.closest('[data-gstr2a-column-picker]')) {
      this.columnPickerOpen.set(false);
    }
  }

  toggleColumnPicker(): void {
    this.columnPickerOpen.update((open) => !open);
  }

  isColumnVisible(columnId: string): boolean {
    const col = this.tableColumns().find((c) => c.id === columnId);
    if (col?.locked) {
      return true;
    }
    return this.columnVisibility()[columnId] !== false;
  }

  toggleColumn(columnId: string): void {
    const col = this.tableColumns().find((c) => c.id === columnId);
    if (col?.locked) {
      return;
    }
    this.columnVisibility.update((m) => ({
      ...m,
      [columnId]: !this.isColumnVisible(columnId),
    }));
  }

  checkAllColumns(): void {
    this.columnVisibility.set(defaultColumnVisibility(this.tableColumns()));
  }

  uncheckAllColumns(): void {
    const out: Record<string, boolean> = {};
    for (const col of this.tableColumns()) {
      out[col.id] = !!col.locked;
    }
    this.columnVisibility.set(out);
  }

  cellValue(row: Gstr2aTdsTcsCreditRow, field: Gstr2aTdsTcsColumnDef['field']): string {
    return this.displayCell(String(row[field] ?? ''));
  }

  updateSearch(value: string): void {
    this.searchQuery.set(value);
  }

  dismissEmptyNotice(): void {
    this.emptyNoticeDismissed.set(true);
  }

  openGstHelp(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    window.open('https://www.gst.gov.in/', '_blank', 'noopener,noreferrer');
  }

  async loadCredits(): Promise<void> {
    if (!this.paramsValid() || this.viewState() === 'loading') {
      return;
    }
    this.viewState.set('loading');
    this.httpError.set(null);
    this.emptyNoticeDismissed.set(false);

    try {
      const bundle = await this.tdsTcsCache.ensureBundle(
        this.gstin(),
        this.retPeriod(),
      );
      if (this.tdsTcsCache.loadError()) {
        this.viewState.set('error');
        return;
      }
      if (!bundle) {
        this.viewState.set('error');
        return;
      }
      const rows = bundle[this.section()];
      this.viewState.set(rows.length > 0 ? 'success' : 'empty');
    } catch (err: unknown) {
      this.httpError.set(normalizeErrorEnvelope(err));
      this.viewState.set('error');
    }
  }

  downloadCsv(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const rows = this.filteredRows();
    if (rows.length === 0) {
      return;
    }
    const csv = gstr2aTdsTcsRowsToCsv(
      rows,
      this.visibleColumns().map((c) => ({ label: c.label, field: c.field })),
    );
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.pageMeta().csvPrefix}-${this.gstin()}-${this.retPeriod()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  displayCell(value: string): string {
    const v = value.trim();
    return v.length > 0 ? v : '—';
  }
}
