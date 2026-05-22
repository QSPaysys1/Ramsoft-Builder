import { computed, Injectable, signal } from '@angular/core';

/** Client-side pagination for section tables. */
@Injectable({ providedIn: 'root' })
export class Gstr2aPaginationStore {
  readonly page = signal(1);
  readonly pageSize = signal(50);
  readonly total = signal(0);

  readonly totalPages = computed(() => {
    const size = this.pageSize();
    const t = this.total();
    if (size <= 0 || t <= 0) {
      return 1;
    }
    return Math.max(1, Math.ceil(t / size));
  });

  reset(): void {
    this.page.set(1);
    this.total.set(0);
  }

  setTotal(count: number): void {
    this.total.set(Math.max(0, count));
    const maxPage = this.totalPages();
    if (this.page() > maxPage) {
      this.page.set(maxPage);
    }
  }

  pageSlice<T>(rows: readonly T[]): readonly T[] {
    const p = this.page();
    const size = this.pageSize();
    if (size <= 0) {
      return rows;
    }
    const start = (p - 1) * size;
    return rows.slice(start, start + size);
  }
}
