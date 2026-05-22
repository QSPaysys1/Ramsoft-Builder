import { signal } from '@angular/core';
import { GSTR2B_RETURN_PERIOD_REGEX } from '@ramsoft-builder/gstr2b/utils/constants';
import type { Gstr2bSectionViewState } from '@ramsoft-builder/gstr2b/models/enums';

/** Base store for a bundle slice (B2B documents, CDN, etc.). */
export abstract class Gstr2bSectionStoreBase<TRow> {
  readonly viewState = signal<Gstr2bSectionViewState>('idle');
  readonly gstin = signal('');
  readonly retPeriod = signal('');
  readonly filingLabel = signal('');
  readonly rows = signal<readonly TRow[]>([]);
  readonly logicalError = signal<string | null>(null);

  setContext(gstin: string, retPeriod: string, filingLabel = ''): void {
    this.gstin.set(gstin.trim().toUpperCase());
    this.retPeriod.set(retPeriod.trim());
    this.filingLabel.set(filingLabel.trim());
  }

  paramsValid(): boolean {
    const g = this.gstin().trim();
    const r = this.retPeriod().trim();
    return g.length === 15 && GSTR2B_RETURN_PERIOD_REGEX.test(r);
  }

  resetForLoad(): void {
    this.viewState.set('loading');
    this.logicalError.set(null);
    this.rows.set([]);
  }
}
