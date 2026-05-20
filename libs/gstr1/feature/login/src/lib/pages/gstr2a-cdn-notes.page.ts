import { isPlatformBrowser, JsonPipe } from '@angular/common';
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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  gstr2aCdnNoteKey,
  gstr2aCdnRowsToCsv,
  RETURN_PERIOD_REGEX,
  type Gstr2aCdnNoteWiseRow,
} from '@ramsoft-builder/gstr1/data-access/gstzen-auth';
import { Gstr2aCdnCacheService } from '../services/gstr2a-cdn-cache.service';
import { monthNameFromMmYyyy } from '../utils/gstr2a-period-labels';

type ViewState = 'idle' | 'loading' | 'success' | 'empty' | 'error';

export interface Gstr2aCdnNoteColumnDef {
  readonly id: string;
  readonly label: string;
  readonly field: keyof Gstr2aCdnNoteWiseRow;
}

const NOTE_COLUMNS: readonly Gstr2aCdnNoteColumnDef[] = [
  { id: 'noteType', label: 'Note type', field: 'noteType' },
  { id: 'noteNumber', label: 'Credit/debit note no.', field: 'noteNumber' },
  { id: 'noteDate', label: 'Credit/debit note date', field: 'noteDate' },
  { id: 'placeOfSupply', label: 'Place of supply', field: 'placeOfSupply' },
  { id: 'noteSupplyType', label: 'Note supply type', field: 'noteSupplyType' },
  { id: 'reverseCharge', label: 'Supply attract reverse charge', field: 'reverseCharge' },
  { id: 'taxableValue', label: 'Taxable value (₹)', field: 'taxableValue' },
  { id: 'integratedTax', label: 'Integrated tax (₹)', field: 'integratedTax' },
  { id: 'centralTax', label: 'Central tax (₹)', field: 'centralTax' },
  { id: 'stateTax', label: 'State/UT tax (₹)', field: 'stateTax' },
  { id: 'cess', label: 'Cess (₹)', field: 'cess' },
  { id: 'source', label: 'Source', field: 'source' },
];

function defaultColumnVisibility(): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const col of NOTE_COLUMNS) {
    out[col.id] = true;
  }
  return out;
}

@Component({
  selector: 'lib-gstr2a-cdn-notes-page',
  standalone: true,
  imports: [JsonPipe, RouterLink],
  templateUrl: './gstr2a-cdn-notes.page.html',
  styleUrl: './gstr2a-cdn.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-[60vh]' },
})
export class Gstr2aCdnNotesPageComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  readonly cdnCache = inject(Gstr2aCdnCacheService);

  readonly gstin = signal('');
  readonly retPeriod = signal('');
  readonly filingLabel = signal('');
  readonly supplierGstin = signal('');
  readonly searchQuery = signal('');
  readonly columnPickerOpen = signal(false);
  readonly columnVisibility = signal<Record<string, boolean>>(defaultColumnVisibility());

  readonly tableColumns = NOTE_COLUMNS;
  readonly trackNoteKey = gstr2aCdnNoteKey;
  readonly viewState = signal<ViewState>('idle');

  readonly paramsValid = computed(() => {
    const g = this.gstin().trim();
    const r = this.retPeriod().trim();
    const s = this.supplierGstin().trim();
    return g.length === 15 && RETURN_PERIOD_REGEX.test(r) && s.length === 15;
  });

  readonly taxPeriodLabel = computed(() => monthNameFromMmYyyy(this.retPeriod()));

  readonly noteRows = computed((): readonly Gstr2aCdnNoteWiseRow[] => {
    const s = this.supplierGstin().trim().toUpperCase();
    const bundle = this.cdnCache.bundle();
    if (!bundle || !s) {
      return [];
    }
    return bundle.notes.filter((n) => n.supplierGstin === s);
  });

  readonly filteredNotes = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const rows = this.noteRows();
    if (!q) {
      return rows;
    }
    return rows.filter(
      (row) =>
        row.noteNumber.toLowerCase().includes(q) ||
        row.noteType.toLowerCase().includes(q) ||
        row.placeOfSupply.toLowerCase().includes(q),
    );
  });

  readonly visibleColumns = computed(() =>
    NOTE_COLUMNS.filter((col) => this.isColumnVisible(col.id)),
  );

  readonly baseQueryParams = computed(() => ({
    gstin: this.gstin().trim().toUpperCase(),
    ret_period: this.retPeriod().trim(),
    filing_status: this.filingLabel().trim() || undefined,
    supplier_gstin: this.supplierGstin().trim().toUpperCase(),
  }));

  readonly supplierLabel = computed(() => {
    const s = this.supplierGstin();
    const first = this.noteRows()[0];
    return first?.supplierName?.trim() || s;
  });

  constructor() {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((q) => {
        const g = (q.get('gstin') ?? '').trim().toUpperCase();
        const r = (q.get('ret_period') ?? '').trim();
        const fl = (q.get('filing_status') ?? '').trim();
        const s = (q.get('supplier_gstin') ?? '').trim().toUpperCase();
        if (g) {
          this.gstin.set(g);
        }
        if (r) {
          this.retPeriod.set(r);
        }
        if (fl) {
          this.filingLabel.set(fl);
        }
        if (s) {
          this.supplierGstin.set(s);
        }
      });

    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) {
        return;
      }
      void this.loadNotes();
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
    this.columnPickerOpen.update((v) => !v);
  }

  isColumnVisible(id: string): boolean {
    return this.columnVisibility()[id] !== false;
  }

  toggleColumn(id: string): void {
    this.columnVisibility.update((m) => ({ ...m, [id]: !this.isColumnVisible(id) }));
  }

  checkAllColumns(): void {
    this.columnVisibility.set(defaultColumnVisibility());
  }

  uncheckAllColumns(): void {
    const out: Record<string, boolean> = {};
    for (const col of NOTE_COLUMNS) {
      out[col.id] = false;
    }
    out['noteNumber'] = true;
    out['noteType'] = true;
    this.columnVisibility.set(out);
  }

  noteDetailQueryParams(note: Gstr2aCdnNoteWiseRow): Record<string, string | undefined> {
    return {
      ...this.baseQueryParams(),
      note_no: note.noteNumber,
      note_date: note.noteDate || undefined,
      note_key: gstr2aCdnNoteKey(note),
    };
  }

  updateSearch(value: string): void {
    this.searchQuery.set(value);
  }

  async loadNotes(): Promise<void> {
    if (!this.paramsValid()) {
      this.viewState.set('idle');
      return;
    }
    this.viewState.set('loading');
    const bundle = await this.cdnCache.ensureBundle(this.gstin(), this.retPeriod());
    if (this.cdnCache.loadError() || !bundle) {
      this.viewState.set('error');
      return;
    }
    this.viewState.set(this.noteRows().length > 0 ? 'success' : 'empty');
  }

  downloadCsv(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const rows = this.filteredNotes();
    if (rows.length === 0) {
      return;
    }
    const cols = this.visibleColumns()
      .filter((c) => c.field !== 'items')
      .map((c) => ({
        label: c.label,
        field: c.field as Exclude<keyof Gstr2aCdnNoteWiseRow, 'items'>,
      }));
    const flat = rows.map((r) => {
      const { items: _items, ...rest } = r;
      return rest;
    });
    const csv = gstr2aCdnRowsToCsv(flat, cols);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gstr2a-cdn-notes-${this.supplierGstin()}-${this.retPeriod()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  displayCell(value: string): string {
    const v = value.trim();
    return v.length > 0 ? v : '—';
  }

  cellValue(row: Gstr2aCdnNoteWiseRow, field: keyof Gstr2aCdnNoteWiseRow): string {
    if (field === 'items') {
      return '—';
    }
    return this.displayCell(String(row[field] ?? ''));
  }
}
