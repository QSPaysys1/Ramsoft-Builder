import { computed, inject, Injectable, signal } from '@angular/core';
import {
  GstrReturnPeriodStore,
  type GstrReturnPeriodFilters,
} from '@ramsoft-builder/gstr1/data-access/gstr-returns';
import { GSTR2A_RETURN_PERIOD_REGEX } from '@ramsoft-builder/gstr2a/utils/constants';
import type { Gstr2aWorkspaceQueryParams } from '@ramsoft-builder/gstr2a/data-access/state';
import {
  indianFyLabelFromMmYyyy,
  monthNameFromMmYyyy,
} from '@ramsoft-builder/gstr2a/utils/helpers';

/**
 * GSTR-2A workspace period + GSTIN context.
 * FY/quarter coherence delegates to {@link GstrReturnPeriodStore}.
 */
@Injectable({ providedIn: 'root' })
export class Gstr2aReturnPeriodStore {
  private readonly gstr1Period = inject(GstrReturnPeriodStore);

  readonly gstin = signal('');
  readonly filingLabel = signal('');

  readonly retPeriod = this.gstr1Period.selectedRetPeriod;
  readonly fyLabel = computed(() => indianFyLabelFromMmYyyy(this.retPeriod()));
  readonly taxPeriodLabel = computed(() => monthNameFromMmYyyy(this.retPeriod()));

  readonly paramsValid = computed(() => {
    const g = this.gstin().trim();
    const r = this.retPeriod().trim();
    return g.length === 15 && GSTR2A_RETURN_PERIOD_REGEX.test(r);
  });

  syncFromQueryParams(params: Gstr2aWorkspaceQueryParams): void {
    const g = (params.gstin ?? '').trim().toUpperCase();
    const r = (params.ret_period ?? '').trim();
    const fl = (params.filing_status ?? '').trim();
    if (g) {
      this.gstin.set(g);
    }
    if (r && GSTR2A_RETURN_PERIOD_REGEX.test(r)) {
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
