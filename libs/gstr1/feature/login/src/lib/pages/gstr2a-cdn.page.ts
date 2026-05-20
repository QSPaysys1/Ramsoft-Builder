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
  RETURN_PERIOD_REGEX,
  type Gstr2aCdnSupplierSummary,
} from '@ramsoft-builder/gstr1/data-access/gstzen-auth';
import { catchError, of, switchMap } from 'rxjs';
import { Gstr2aCdnCacheService } from '../services/gstr2a-cdn-cache.service';
import {
  indianFyLabelFromMmYyyy,
  monthNameFromMmYyyy,
  pickProfileString,
} from '../utils/gstr2a-period-labels';

type ViewState = 'idle' | 'loading' | 'success' | 'empty' | 'error';

export interface Gstr2aCdnSupplierColumnDef {
  readonly id: string;
  readonly label: string;
  readonly field: keyof Gstr2aCdnSupplierSummary;
  readonly locked?: boolean;
}

export const GSTR2A_CDN_SUPPLIER_COLUMNS: readonly Gstr2aCdnSupplierColumnDef[] = [
  { id: 'supplierGstin', label: 'GSTIN of Supplier', field: 'supplierGstin', locked: true },
  { id: 'supplierName', label: 'Supplier Name', field: 'supplierName' },
  { id: 'noteCount', label: 'No. of notes', field: 'noteCount' },
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

function defaultSupplierColumnVisibility(): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const col of GSTR2A_CDN_SUPPLIER_COLUMNS) {
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
  selector: 'lib-gstr2a-cdn-page',
  standalone: true,
  imports: [JsonPipe, RouterLink],
  templateUrl: './gstr2a-cdn.page.html',
  styleUrl: './gstr2a-cdn.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-[60vh]' },
})
export class Gstr2aCdnPageComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  readonly cdnCache = inject(Gstr2aCdnCacheService);
  private readonly authStore = inject(AuthStore);
  private readonly userProfile = inject(UserProfileRepository);

  readonly gstin = signal('');
  readonly retPeriod = signal('');
  readonly filingLabel = signal('');
  readonly legalName = signal('');
  readonly tradeName = signal('');
  readonly searchQuery = signal('');
  readonly columnPickerOpen = signal(false);
  readonly columnVisibility = signal<Record<string, boolean>>(
    defaultSupplierColumnVisibility(),
  );

  readonly tableColumns = GSTR2A_CDN_SUPPLIER_COLUMNS;

  readonly viewState = signal<ViewState>('idle');
  readonly httpError = signal<unknown>(null);

  readonly fyLabel = computed(() => indianFyLabelFromMmYyyy(this.retPeriod()));
  readonly taxPeriodLabel = computed(() => monthNameFromMmYyyy(this.retPeriod()));

  readonly paramsValid = computed(() => {
    const g = this.gstin().trim();
    const r = this.retPeriod().trim();
    return g.length === 15 && RETURN_PERIOD_REGEX.test(r);
  });

  readonly supplierRows = computed((): readonly Gstr2aCdnSupplierSummary[] => {
    return this.cdnCache.bundle()?.suppliers ?? [];
  });

  readonly filteredSuppliers = computed(() => {
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
    GSTR2A_CDN_SUPPLIER_COLUMNS.filter((col) => this.isColumnVisible(col.id)),
  );

  supplierNotesQueryParams(supplierGstin: string): Record<string, string | undefined> {
    return {
      ...this.backToGstr2aQueryParams(),
      supplier_gstin: supplierGstin,
    };
  }

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
            'companyName',
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
      void this.loadSuppliers();
    });
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
    const col = GSTR2A_CDN_SUPPLIER_COLUMNS.find((c) => c.id === columnId);
    if (col?.locked) {
      return true;
    }
    return this.columnVisibility()[columnId] !== false;
  }

  toggleColumn(columnId: string): void {
    const col = GSTR2A_CDN_SUPPLIER_COLUMNS.find((c) => c.id === columnId);
    if (col?.locked) {
      return;
    }
    this.columnVisibility.update((m) => ({
      ...m,
      [columnId]: !this.isColumnVisible(columnId),
    }));
  }

  checkAllColumns(): void {
    this.columnVisibility.set(defaultSupplierColumnVisibility());
  }

  uncheckAllColumns(): void {
    const out: Record<string, boolean> = {};
    for (const col of GSTR2A_CDN_SUPPLIER_COLUMNS) {
      out[col.id] = !!col.locked;
    }
    this.columnVisibility.set(out);
  }

  cellValue(row: Gstr2aCdnSupplierSummary, field: keyof Gstr2aCdnSupplierSummary): string {
    if (field === 'noteCount') {
      return String(row.noteCount);
    }
    return this.displayCell(String(row[field] ?? ''));
  }

  updateSearch(value: string): void {
    this.searchQuery.set(value);
  }

  async loadSuppliers(): Promise<void> {
    if (!this.paramsValid() || this.viewState() === 'loading') {
      return;
    }
    this.viewState.set('loading');
    this.httpError.set(null);

    const bundle = await this.cdnCache.ensureBundle(
      this.gstin(),
      this.retPeriod(),
    );
    const err = this.cdnCache.loadError();
    if (err) {
      this.viewState.set('error');
      return;
    }
    if (!bundle) {
      this.viewState.set('error');
      return;
    }
    this.viewState.set(bundle.suppliers.length > 0 ? 'success' : 'empty');
  }

  displayCell(value: string): string {
    const v = value.trim();
    return v.length > 0 ? v : '—';
  }
}
