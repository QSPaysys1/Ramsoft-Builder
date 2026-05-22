import { Injectable, signal } from '@angular/core';
import type { Gstr2bBundle } from '@ramsoft-builder/gstr2b/models/entities';
import type { Gstr2bSectionViewState } from '@ramsoft-builder/gstr2b/models/enums';

/**
 * Holds the parsed GSTR-2B statement bundle (one POST per GSTIN + period).
 * Section stores read slices via facades — no per-section HTTP calls.
 */
@Injectable({ providedIn: 'root' })
export class Gstr2bWorkspaceStore {
  readonly viewState = signal<Gstr2bSectionViewState>('idle');
  readonly gstin = signal('');
  readonly retPeriod = signal('');
  readonly filingLabel = signal('');
  readonly bundle = signal<Gstr2bBundle | null>(null);
  readonly httpError = signal<unknown>(null);
  readonly logicalError = signal<string | null>(null);
  /** Last successful cache key — see `gstr2bStatementCacheKey`. */
  readonly cacheKey = signal<string | null>(null);

  setContext(gstin: string, retPeriod: string, filingLabel = ''): void {
    this.gstin.set(gstin.trim().toUpperCase());
    this.retPeriod.set(retPeriod.trim());
    this.filingLabel.set(filingLabel.trim());
  }

  resetForLoad(): void {
    this.viewState.set('loading');
    this.httpError.set(null);
    this.logicalError.set(null);
    this.bundle.set(null);
  }
}
