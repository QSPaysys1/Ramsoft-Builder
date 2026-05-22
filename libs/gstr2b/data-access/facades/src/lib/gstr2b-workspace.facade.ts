import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Gstr2bStatementApiService } from '@ramsoft-builder/gstr2b/data-access/api';
import { normalizeGstr2bHttpError } from '@ramsoft-builder/gstr2b/data-access/services';
import { Gstr2bWorkspaceStore } from '@ramsoft-builder/gstr2b/data-access/stores';
import { gstr2bStatementCacheKey } from '@ramsoft-builder/gstr2b/shared/caching';
import {
  gstr22bLogicalError,
  parseGstr2bBundle,
} from '@ramsoft-builder/gstr2b/utils/mappers';

/**
 * Loads the single GSTR-2B statement and caches by GSTIN + period in-memory for the session.
 */
@Injectable({ providedIn: 'root' })
export class Gstr2bWorkspaceFacade {
  private readonly api = inject(Gstr2bStatementApiService);
  readonly store = inject(Gstr2bWorkspaceStore);

  readonly viewState = this.store.viewState;
  readonly bundle = this.store.bundle;
  readonly httpError = this.store.httpError;
  readonly logicalError = this.store.logicalError;
  readonly gstin = this.store.gstin;
  readonly retPeriod = this.store.retPeriod;

  async load(gstin: string, retPeriod: string, filingLabel = '', force = false): Promise<void> {
    this.store.setContext(gstin, retPeriod, filingLabel);
    const key = gstr2bStatementCacheKey(gstin, retPeriod);
    if (
      !force &&
      this.store.cacheKey() === key &&
      this.store.bundle() &&
      this.store.viewState() === 'success'
    ) {
      return;
    }
    if (this.store.viewState() === 'loading') {
      return;
    }
    this.store.resetForLoad();
    try {
      const payload = await firstValueFrom(
        this.api.fetch({ gstin, ret_period: retPeriod }),
      );
      const logical = gstr22bLogicalError(payload);
      if (logical) {
        this.store.logicalError.set(logical);
        this.store.viewState.set('error');
        return;
      }
      const bundle = parseGstr2bBundle(payload);
      if (!bundle) {
        this.store.logicalError.set('GSTR-2B response could not be parsed.');
        this.store.viewState.set('error');
        return;
      }
      this.store.bundle.set(bundle);
      this.store.cacheKey.set(key);
      this.store.viewState.set('success');
    } catch (err: unknown) {
      this.store.httpError.set(normalizeGstr2bHttpError(err));
      this.store.viewState.set('error');
    }
  }
}
