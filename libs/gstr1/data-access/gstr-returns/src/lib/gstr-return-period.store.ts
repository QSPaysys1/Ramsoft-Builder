import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, computed, effect, inject, Injectable, signal } from '@angular/core';
import { RETURN_PERIOD_REGEX } from '@ramsoft-builder/gstr1/data-access/gstzen-auth';
import {
  type IndianFySelection,
  type PeriodMonthOption,
  type QuarterId,
  defaultSelectionForDate,
  listIndianFinancialYears,
  periodMonthsForQuarter,
} from './indian-fy-return-period';

export const GSTR_RETURN_PERIOD_STORAGE_KEY = 'gstr1-returns-dashboard-filters-v2';

export interface GstrReturnPeriodFilters {
  readonly fyStartYear: number;
  readonly quarter: QuarterId;
  readonly retPeriod: string;
}

/**
 * Shared return-period selection (Indian FY, quarter, `MMYYYY` tax period).
 * Persisted in `sessionStorage` for the returns dashboard and consumed by GSTR-1 workspace routes.
 */
@Injectable({ providedIn: 'root' })
export class GstrReturnPeriodStore {
  private readonly platformId = inject(PLATFORM_ID);

  readonly fyOptions = signal<IndianFySelection[]>([]);
  readonly selectedFyStart = signal<number>(defaultFilters().fyStartYear);
  readonly selectedQuarter = signal<QuarterId>(defaultFilters().quarter);
  readonly selectedRetPeriod = signal<string>(defaultFilters().retPeriod);

  readonly periodOptions = computed((): PeriodMonthOption[] =>
    periodMonthsForQuarter(this.selectedFyStart(), this.selectedQuarter()),
  );

  readonly canUseRetPeriod = computed(() =>
    RETURN_PERIOD_REGEX.test(this.selectedRetPeriod().trim()),
  );

  constructor() {
    effect(() => {
      if (!isPlatformBrowser(this.platformId)) {
        return;
      }
      const snap: GstrReturnPeriodFilters = {
        fyStartYear: this.selectedFyStart(),
        quarter: this.selectedQuarter(),
        retPeriod: this.selectedRetPeriod(),
      };
      sessionStorage.setItem(GSTR_RETURN_PERIOD_STORAGE_KEY, JSON.stringify(snap));
    });
  }

  /** Browser-only: load FY list and restore filters from storage. */
  initializeFilters(now = new Date()): void {
    this.fyOptions.set(listIndianFinancialYears(now));
    if (!this.restoreFromStorage()) {
      this.applyFilters(defaultFilters(now));
    }
    this.ensureCoherent(now);
  }

  setFyStartYear(year: number): void {
    if (!Number.isFinite(year)) {
      return;
    }
    this.selectedFyStart.set(year);
    this.ensureCoherent();
  }

  setQuarter(quarter: QuarterId): void {
    this.selectedQuarter.set(quarter);
    this.ensureCoherent();
  }

  setRetPeriod(retPeriod: string): void {
    if (!RETURN_PERIOD_REGEX.test(retPeriod)) {
      return;
    }
    this.selectedRetPeriod.set(retPeriod);
  }

  applyFilters(state: GstrReturnPeriodFilters): void {
    this.selectedFyStart.set(state.fyStartYear);
    this.selectedQuarter.set(state.quarter);
    this.selectedRetPeriod.set(state.retPeriod);
  }

  /** Keep `ret_period` valid for the selected FY/quarter. */
  ensureCoherent(now = new Date()): void {
    const opts = this.periodOptions();
    if (opts.length === 0) {
      return;
    }
    const cur = this.selectedRetPeriod();
    if (opts.some((o) => o.retPeriod === cur)) {
      return;
    }
    this.selectedRetPeriod.set(this.preferredPeriodForQuarter(now));
  }

  private preferredPeriodForQuarter(now = new Date()): string {
    const fyStart = this.selectedFyStart();
    const quarter = this.selectedQuarter();
    const opts = periodMonthsForQuarter(fyStart, quarter);
    if (opts.length === 0) {
      return this.selectedRetPeriod();
    }
    const today = defaultSelectionForDate(now);
    if (today.fy.startYear === fyStart && today.quarter === quarter) {
      return today.retPeriod;
    }
    return opts[opts.length - 1]?.retPeriod ?? opts[0].retPeriod;
  }

  private restoreFromStorage(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }
    try {
      const raw = sessionStorage.getItem(GSTR_RETURN_PERIOD_STORAGE_KEY);
      if (!raw) {
        return false;
      }
      const o = JSON.parse(raw) as Partial<GstrReturnPeriodFilters>;
      const fys = this.fyOptions().map((x) => x.startYear);
      if (typeof o.fyStartYear !== 'number' || !fys.includes(o.fyStartYear)) {
        return false;
      }
      if (o.quarter !== 'q1' && o.quarter !== 'q2' && o.quarter !== 'q3' && o.quarter !== 'q4') {
        return false;
      }
      if (typeof o.retPeriod !== 'string' || !RETURN_PERIOD_REGEX.test(o.retPeriod)) {
        return false;
      }
      const opts = periodMonthsForQuarter(o.fyStartYear, o.quarter);
      if (!opts.some((p) => p.retPeriod === o.retPeriod)) {
        return false;
      }
      this.applyFilters({
        fyStartYear: o.fyStartYear,
        quarter: o.quarter,
        retPeriod: o.retPeriod,
      });
      return true;
    } catch {
      return false;
    }
  }
}

function defaultFilters(now = new Date()): GstrReturnPeriodFilters {
  const d = defaultSelectionForDate(now);
  return {
    fyStartYear: d.fy.startYear,
    quarter: d.quarter,
    retPeriod: d.retPeriod,
  };
}
