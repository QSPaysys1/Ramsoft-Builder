import { signal } from '@angular/core';
import type {
  Gstr1DownloadAggregateStats,
  Gstr1DownloadCtinGroup,
} from '@ramsoft-builder/gstr1a/models/entities';
import type { Gstr1aViewState } from '@ramsoft-builder/gstr1a/models/enums';
import { RETURN_PERIOD_REGEX } from '@ramsoft-builder/gstr1a/utils/constants';

/** Per-section signal store — extend for B2B, B2BA, etc. */
export abstract class Gstr1aSectionStoreBase {
  readonly viewState = signal<Gstr1aViewState>('idle');
  readonly gstin = signal('');
  readonly retPeriod = signal('');
  readonly filingLabel = signal('');
  readonly logicalError = signal<string | null>(null);
  readonly httpError = signal<unknown>(null);
  readonly rawResponse = signal<unknown>(null);
  readonly hierarchy = signal<readonly Gstr1DownloadCtinGroup[]>([]);
  readonly aggregate = signal<Gstr1DownloadAggregateStats | null>(null);
  readonly retsaveSubmitting = signal(false);
  readonly retsaveError = signal<unknown>(null);
  readonly retsaveSuccessPayload = signal<unknown>(null);

  setContext(gstin: string, retPeriod: string, filingLabel = ''): void {
    this.gstin.set(gstin.trim().toUpperCase());
    this.retPeriod.set(retPeriod.trim());
    this.filingLabel.set(filingLabel.trim());
  }

  paramsValid(): boolean {
    const g = this.gstin().trim();
    const r = this.retPeriod().trim();
    return g.length === 15 && RETURN_PERIOD_REGEX.test(r);
  }

  resetForLoad(): void {
    this.viewState.set('loading');
    this.logicalError.set(null);
    this.httpError.set(null);
    this.hierarchy.set([]);
    this.aggregate.set(null);
  }
}
