import { computed, inject, Injectable, signal } from '@angular/core';
import {
  GstrReturnPeriodStore,
  type GstrReturnPeriodFilters,
} from '@ramsoft-builder/gstr1/data-access/gstr-returns';
import { GSTR3B_RETURN_PERIOD_REGEX } from '@ramsoft-builder/gstr3b/utils/constants';
import type { Gstr3bWorkspaceQueryParams } from '@ramsoft-builder/gstr3b/data-access/state';
import {
  indianFyLabelFromMmYyyy,
  monthNameFromMmYyyy,
} from '@ramsoft-builder/gstr3b/utils/helpers';

@Injectable({ providedIn: 'root' })
export class Gstr3bReturnPeriodStore {
  private readonly gstr1Period = inject(GstrReturnPeriodStore);

  readonly gstin = signal('');
  readonly filingLabel = signal('');
  readonly retPeriod = this.gstr1Period.selectedRetPeriod;

  readonly fyLabel = computed(() => indianFyLabelFromMmYyyy(this.retPeriod()));
  readonly taxPeriodLabel = computed(() => monthNameFromMmYyyy(this.retPeriod()));

  readonly paramsValid = computed(() => {
    const g = this.gstin().trim();
    const r = this.retPeriod().trim();
    return g.length === 15 && GSTR3B_RETURN_PERIOD_REGEX.test(r);
  });

  syncFromQueryParams(params: Gstr3bWorkspaceQueryParams): void {
    const g = (params.gstin ?? '').trim().toUpperCase();
    const r = (params.ret_period ?? '').trim();
    const fl = (params.filing_status ?? '').trim();
    if (g) {
      this.gstin.set(g);
    }
    if (r && GSTR3B_RETURN_PERIOD_REGEX.test(r)) {
      this.gstr1Period.setRetPeriod(r);
    }
    if (fl) {
      this.filingLabel.set(fl);
    }
  }

  toQueryParams(): Record<string, string | undefined> {
    return {
      gstin: this.gstin().trim().toUpperCase() || undefined,
      ret_period: this.retPeriod().trim() || undefined,
      filing_status: this.filingLabel().trim() || undefined,
    };
  }

  applyGstr1Filters(state: GstrReturnPeriodFilters): void {
    this.gstr1Period.applyFilters(state);
  }

  initializeFilters(now = new Date()): void {
    this.gstr1Period.initializeFilters(now);
  }
}
