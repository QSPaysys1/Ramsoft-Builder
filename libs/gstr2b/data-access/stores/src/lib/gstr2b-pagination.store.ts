import { Injectable, signal } from '@angular/core';
import { GSTR2B_RECORDS_PER_PAGE_OPTIONS } from '@ramsoft-builder/gstr2b/utils/constants';

@Injectable({ providedIn: 'root' })
export class Gstr2bPaginationStore {
  readonly pageSize = signal<number>(GSTR2B_RECORDS_PER_PAGE_OPTIONS[0]);
  readonly pageIndex = signal(0);

  readonly pageSizeOptions = GSTR2B_RECORDS_PER_PAGE_OPTIONS;

  paginatedSlice<T>(rows: readonly T[]): readonly T[] {
    const size = this.pageSize();
    const start = this.pageIndex() * size;
    return rows.slice(start, start + size);
  }

  totalPages(total: number): number {
    return Math.max(1, Math.ceil(total / this.pageSize()));
  }

  resetPage(): void {
    this.pageIndex.set(0);
  }
}
