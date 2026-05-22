import { Injectable, signal } from '@angular/core';
import type { Gstr1aViewState } from '@ramsoft-builder/gstr1a/models/enums';
import { RETURN_PERIOD_REGEX } from '@ramsoft-builder/gstr1a/utils/constants';

/** Hub workspace: RETSUM counts, selected api_name, last download payload. */
@Injectable({ providedIn: 'root' })
export class Gstr1aWorkspaceStore {
  readonly viewState = signal<Gstr1aViewState>('idle');
  readonly gstin = signal('');
  readonly retPeriod = signal('');
  readonly filingLabel = signal('');
  readonly cacheKey = signal('');
  readonly httpError = signal<unknown>(null);
  readonly logicalError = signal<string | null>(null);
  readonly retsumPayload = signal<unknown>(null);
  readonly portalTileCounts = signal<readonly number[]>([]);

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
    this.httpError.set(null);
    this.logicalError.set(null);
  }
}
