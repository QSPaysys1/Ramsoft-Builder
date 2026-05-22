import { signal } from '@angular/core';
import { GSTR2A_RETURN_PERIOD_REGEX } from '@ramsoft-builder/gstr2a/utils/constants';
import type { Gstr2aSectionViewState } from '@ramsoft-builder/gstr2a/models/enums';

/**
 * Base signal store for a GSTR-2A inward-supply section.
 * Subclasses set `rows` typing; facades call `setContext` then `load`.
 */
export abstract class Gstr2aSectionStoreBase<TRow> {
  /** UI lifecycle — drives loaders / empty / error panels. */
  readonly viewState = signal<Gstr2aSectionViewState>('idle');

  readonly gstin = signal('');
  readonly retPeriod = signal('');
  readonly filingLabel = signal('');

  readonly rows = signal<readonly TRow[]>([]);
  readonly httpError = signal<unknown>(null);
  readonly logicalError = signal<string | null>(null);

  setContext(gstin: string, retPeriod: string, filingLabel = ''): void {
    this.gstin.set(gstin.trim().toUpperCase());
    this.retPeriod.set(retPeriod.trim());
    this.filingLabel.set(filingLabel.trim());
  }

  /** True when route/query has a 15-char GSTIN and valid MMYYYY period. */
  paramsValid(): boolean {
    const g = this.gstin().trim();
    const r = this.retPeriod().trim();
    return g.length === 15 && GSTR2A_RETURN_PERIOD_REGEX.test(r);
  }

  resetForLoad(): void {
    this.viewState.set('loading');
    this.httpError.set(null);
    this.logicalError.set(null);
    this.rows.set([]);
  }
}
