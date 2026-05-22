import { Injectable, signal } from '@angular/core';
import type { Gstr2aTableColumnDef } from '@ramsoft-builder/gstr2a/models/interfaces';

function defaultVisibility<T extends object>(
  columns: readonly Gstr2aTableColumnDef<T>[],
): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const col of columns) {
    out[col.id] = true;
  }
  return out;
}

/** Search + column visibility for GSTR-2A tables. */
@Injectable({ providedIn: 'root' })
export class Gstr2aTableFilterStore {
  readonly searchQuery = signal('');
  readonly columnPickerOpen = signal(false);
  readonly columnVisibility = signal<Record<string, boolean>>({});

  configureColumns<T extends object>(
    columns: readonly Gstr2aTableColumnDef<T>[],
  ): void {
    this.columnVisibility.set(defaultVisibility(columns));
  }

  isColumnVisible<T extends object>(
    columnId: string,
    columns: readonly Gstr2aTableColumnDef<T>[],
  ): boolean {
    const col = columns.find((c) => c.id === columnId);
    if (col?.locked) {
      return true;
    }
    return this.columnVisibility()[columnId] !== false;
  }

  visibleColumns<T extends object>(
    columns: readonly Gstr2aTableColumnDef<T>[],
  ): readonly Gstr2aTableColumnDef<T>[] {
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
      searchKeys.some((key) => {
        const v = row[key];
        return String(v ?? '')
          .toLowerCase()
          .includes(q);
      }),
    );
  }

  toggleColumnPicker(): void {
    this.columnPickerOpen.update((open) => !open);
  }

  closeColumnPicker(): void {
    this.columnPickerOpen.set(false);
  }

  toggleColumn<T extends object>(
    columnId: string,
    columns: readonly Gstr2aTableColumnDef<T>[],
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

  checkAllColumns<T extends object>(
    columns: readonly Gstr2aTableColumnDef<T>[],
  ): void {
    this.columnVisibility.set(defaultVisibility(columns));
  }

  uncheckAllColumns<T extends object>(
    columns: readonly Gstr2aTableColumnDef<T>[],
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
