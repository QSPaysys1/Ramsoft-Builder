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
  gstr2aB2bRowsToCsv,
  gstr2B2bLogicalError,
  parseGstr2B2bSuppliersFromPayload,
  RETURN_PERIOD_REGEX,
  type Gstr2aB2bSupplierRow,
} from '@ramsoft-builder/gstr1/data-access/gstzen-auth';
import { catchError, firstValueFrom, of, switchMap } from 'rxjs';

type ViewState = 'idle' | 'loading' | 'success' | 'empty' | 'error';

export interface Gstr2aB2bColumnDef {
  readonly id: string;
  readonly label: string;
  readonly field: keyof Gstr2aB2bSupplierRow;
  /** Always shown in the grid (cannot be unchecked). */
  readonly locked?: boolean;
}

export const GSTR2A_B2B_TABLE_COLUMNS: readonly Gstr2aB2bColumnDef[] = [
  { id: 'supplierGstin', label: 'GSTIN of Supplier', field: 'supplierGstin', locked: true },
  { id: 'supplierName', label: 'Supplier Name', field: 'supplierName' },
  {
    id: 'gstr1FilingStatus',
    label: 'GSTR-1/IFF/GSTR-1A/GSTR-5 Filing Status',
    field: 'gstr1FilingStatus',
  },
  {
    id: 'gstr1FilingDate',
    label: 'GSTR-1/IFF/GSTR-1A/GSTR-5 Filing Date',
    field: 'gstr1FilingDate',
  },
  {
    id: 'gstr1FilingPeriod',
    label: 'GSTR-1/IFF/GSTR-1A/GSTR-5 Filing Period',
    field: 'gstr1FilingPeriod',
  },
  { id: 'gstr3bFilingStatus', label: 'GSTR-3B filing status', field: 'gstr3bFilingStatus' },
  {
    id: 'cancellationDate',
    label: 'Effective date of cancellation',
    field: 'cancellationDate',
  },
];

function defaultColumnVisibility(): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const col of GSTR2A_B2B_TABLE_COLUMNS) {
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
  return months[mm - 1] ?? retPeriod;
}

@Component({
  selector: 'lib-gstr2a-b2b-page',
  standalone: true,
  imports: [JsonPipe, RouterLink],
  templateUrl: './gstr2a-b2b.page.html',
  styleUrl: './gstr2a-b2b.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-[60vh]' },
})
export class Gstr2aB2bPageComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(Gstr1GstnOtpApiService);
  private readonly authStore = inject(AuthStore);
  private readonly userProfile = inject(UserProfileRepository);

  readonly gstin = signal('');
  readonly retPeriod = signal('');
  readonly filingLabel = signal('');
  readonly legalName = signal('');
  readonly tradeName = signal('');
  readonly searchQuery = signal('');
  readonly columnPickerOpen = signal(false);
  readonly columnVisibility = signal<Record<string, boolean>>(defaultColumnVisibility());

  readonly tableColumns = GSTR2A_B2B_TABLE_COLUMNS;

  readonly viewState = signal<ViewState>('idle');
  readonly supplierRows = signal<readonly Gstr2aB2bSupplierRow[]>([]);
  readonly httpError = signal<unknown>(null);
  readonly logicalError = signal<string | null>(null);

  readonly fyLabel = computed(() => indianFyLabelFromMmYyyy(this.retPeriod()));
  readonly taxPeriodLabel = computed(() => monthNameFromMmYyyy(this.retPeriod()));

  readonly paramsValid = computed(() => {
    const g = this.gstin().trim();
    const r = this.retPeriod().trim();
    return g.length === 15 && RETURN_PERIOD_REGEX.test(r);
  });

  readonly filteredRows = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const rows = this.supplierRows();
    if (!q) {
      return rows;
    }
    return rows.filter(
      (row) =>
        row.supplierGstin.toLowerCase().includes(q) ||
        row.supplierName.toLowerCase().includes(q),
    );
  });

  readonly backToGstr2aQueryParams = computed(() => ({
    gstin: this.gstin().trim().toUpperCase(),
    ret_period: this.retPeriod().trim(),
    filing_status: this.filingLabel().trim() || undefined,
  }));

  readonly visibleColumns = computed(() =>
    GSTR2A_B2B_TABLE_COLUMNS.filter((col) => this.isColumnVisible(col.id)),
  );

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
            'organizationName',
            'name',
            'Name',
          ]),
        );
        this.tradeName.set(
          pickProfileString(p, [
            'tradeName',
            'TradeName',
            'trade_name',
            'dba',
          ]),
        );
      });

    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) {
        return;
      }
      void this.loadSuppliers();
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
    if (!target.closest('[data-gstr2a-column-picker]')) {
      this.columnPickerOpen.set(false);
    }
  }

  toggleColumnPicker(): void {
    this.columnPickerOpen.update((open) => !open);
  }

  isColumnVisible(columnId: string): boolean {
    const col = GSTR2A_B2B_TABLE_COLUMNS.find((c) => c.id === columnId);
    if (col?.locked) {
      return true;
    }
    return this.columnVisibility()[columnId] !== false;
  }

  toggleColumn(columnId: string): void {
    const col = GSTR2A_B2B_TABLE_COLUMNS.find((c) => c.id === columnId);
    if (col?.locked) {
      return;
    }
    this.columnVisibility.update((m) => ({
      ...m,
      [columnId]: !this.isColumnVisible(columnId),
    }));
  }

  checkAllColumns(): void {
    this.columnVisibility.set(defaultColumnVisibility());
  }

  uncheckAllColumns(): void {
    const out: Record<string, boolean> = {};
    for (const col of GSTR2A_B2B_TABLE_COLUMNS) {
      out[col.id] = !!col.locked;
    }
    this.columnVisibility.set(out);
  }

  cellValue(row: Gstr2aB2bSupplierRow, field: keyof Gstr2aB2bSupplierRow): string {
    return this.displayCell(String(row[field] ?? ''));
  }

  updateSearch(value: string): void {
    this.searchQuery.set(value);
  }

  async loadSuppliers(): Promise<void> {
    if (!this.paramsValid() || this.viewState() === 'loading') {
      return;
    }
    const gstin = this.gstin().trim().toUpperCase();
    const ret_period = this.retPeriod().trim();

    this.viewState.set('loading');
    this.httpError.set(null);
    this.logicalError.set(null);
    this.supplierRows.set([]);

    try {
      const payload = await firstValueFrom(
        this.api.fetchGstr2B2b({ gstin, ret_period }),
      );
      const topErr = gstr2B2bLogicalError(payload);
      if (topErr) {
        this.logicalError.set(topErr);
        this.viewState.set('error');
        return;
      }
      const rows = parseGstr2B2bSuppliersFromPayload(payload);
      this.supplierRows.set(rows);
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
    const csv = gstr2aB2bRowsToCsv(rows, this.visibleColumns());
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gstr2a-b2b-${this.gstin()}-${this.retPeriod()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  displayCell(value: string): string {
    const v = value.trim();
    return v.length > 0 ? v : '—';
  }
}
