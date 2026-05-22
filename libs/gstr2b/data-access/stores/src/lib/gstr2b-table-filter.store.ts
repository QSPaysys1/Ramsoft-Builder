import { Injectable, signal } from '@angular/core';
import type { Gstr2bTableColumnDef } from '@ramsoft-builder/gstr2b/utils/constants';

function defaultVisibility<TRow extends object>(
  columns: readonly Gstr2bTableColumnDef<TRow>[],
): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const col of columns) {
    out[col.id] = !col.defaultHidden;
  }
  return out;
}

@Injectable({ providedIn: 'root' })
export class Gstr2bTableFilterStore {
  readonly searchQuery = signal('');
  readonly columnPickerOpen = signal(false);
  readonly columnVisibility = signal<Record<string, boolean>>({});

  configureColumns<TRow extends object>(
    columns: readonly Gstr2bTableColumnDef<TRow>[],
  ): void {
    this.columnVisibility.set(defaultVisibility(columns));
  }

  isColumnVisible<TRow extends object>(
    columnId: string,
    columns: readonly Gstr2bTableColumnDef<TRow>[],
  ): boolean {
    const col = columns.find((c) => c.id === columnId);
    if (col?.locked) {
      return true;
    }
    return this.columnVisibility()[columnId] !== false;
  }

  visibleColumns<TRow extends object>(
    columns: readonly Gstr2bTableColumnDef<TRow>[],
  ): readonly Gstr2bTableColumnDef<TRow>[] {
    return columns.filter((col) => this.isColumnVisible(col.id, columns));
  }

  filteredRows<T extends object>(
    rows: readonly T[],
    searchKeys: readonly (keyof T & string)[],
  ): readonly T[] {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) {
      return rows;
    }
    return rows.filter((row) =>
      searchKeys.some((key) =>
        String(row[key] ?? '')
          .toLowerCase()
          .includes(q),
      ),
    );
  }

  toggleColumnPicker(): void {
    this.columnPickerOpen.update((o) => !o);
  }

  closeColumnPicker(): void {
    this.columnPickerOpen.set(false);
  }

  toggleColumn<TRow extends object>(
    columnId: string,
    columns: readonly Gstr2bTableColumnDef<TRow>[],
  ): void {
    const col = columns.find((c) => c.id === columnId);
    if (col?.locked) {
      return;
    }
    this.columnVisibility.update((m) => ({
      ...m,
      [columnId]: !this.isColumnVisible(columnId, columns),
    }));
  }

  checkAllColumns<TRow extends object>(
    columns: readonly Gstr2bTableColumnDef<TRow>[],
  ): void {
    const out: Record<string, boolean> = {};
    for (const col of columns) {
      out[col.id] = true;
    }
    this.columnVisibility.set(out);
  }

  uncheckAllColumns<TRow extends object>(
    columns: readonly Gstr2bTableColumnDef<TRow>[],
  ): void {
    const out: Record<string, boolean> = {};
    for (const col of columns) {
      out[col.id] = !!col.locked;
    }
    this.columnVisibility.set(out);
  }

  updateSearch(value: string): void {
    this.searchQuery.set(value);
  }
}
