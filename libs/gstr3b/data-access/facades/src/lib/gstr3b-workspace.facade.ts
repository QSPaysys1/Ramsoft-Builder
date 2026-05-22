import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Gstr3bApiService } from '@ramsoft-builder/gstr3b/data-access/api';
import { normalizeGstr3bHttpError } from '@ramsoft-builder/gstr3b/data-access/services';
import { Gstr3bWorkspaceStore } from '@ramsoft-builder/gstr3b/data-access/stores';
import { gstr3bWorkspaceCacheKey } from '@ramsoft-builder/gstr3b/shared/caching';
import {
  gstr3bAutoliabLogicalError,
  gstr3bRetsumLogicalError,
  parseGstr3bAutoliabBundle,
  parseGstr3bBundleFromRetsum,
  parseGstr3bRetsaveFromRetsum,
} from '@ramsoft-builder/gstr3b/utils/mappers';
import {
  parseGstr3bRetsaveFromAutoliab,
  withComputedItcNet,
} from '@ramsoft-builder/gstr3b/utils/calculators';

/**
 * Shared load: POST retsum first, fallback autoliab (matches legacy pages).
 */
@Injectable({ providedIn: 'root' })
export class Gstr3bWorkspaceFacade {
  private readonly api = inject(Gstr3bApiService);
  readonly store = inject(Gstr3bWorkspaceStore);

  readonly viewState = this.store.viewState;
  readonly autoliabBundle = this.store.autoliabBundle;
  readonly retsaveForm = this.store.retsaveForm;
  readonly httpError = this.store.httpError;
  readonly logicalError = this.store.logicalError;

  async load(gstin: string, retPeriod: string, filingLabel = '', force = false): Promise<void> {
    this.store.setContext(gstin, retPeriod, filingLabel);
    const key = gstr3bWorkspaceCacheKey(gstin, retPeriod);
    if (
      !force &&
      this.store.cacheKey() === key &&
      this.store.autoliabBundle() &&
      this.store.viewState() === 'success'
    ) {
      return;
    }
    if (this.store.viewState() === 'loading') {
      return;
    }
    this.store.resetForLoad();
    const body = { gstin, ret_period: retPeriod };
    try {
      const retsumPayload = await firstValueFrom(this.api.fetchGstr3bRetsum(body));
      const retsumErr = gstr3bRetsumLogicalError(retsumPayload);
      if (!retsumErr) {
        const fromRetsum = parseGstr3bBundleFromRetsum(retsumPayload);
        const form = parseGstr3bRetsaveFromRetsum(retsumPayload);
        if (fromRetsum && form) {
          this.store.autoliabBundle.set(fromRetsum);
          this.store.retsaveForm.set(withComputedItcNet(form));
          this.store.cacheKey.set(key);
          this.store.viewState.set('success');
          return;
        }
      }

      const autoliabPayload = await firstValueFrom(this.api.fetchGstr3bAutoliab(body));
      const autoliabErr = gstr3bAutoliabLogicalError(autoliabPayload);
      if (autoliabErr) {
        this.store.logicalError.set(retsumErr ?? autoliabErr);
        this.store.viewState.set('error');
        return;
      }
      const bundle = parseGstr3bAutoliabBundle(autoliabPayload);
      const form = parseGstr3bRetsaveFromAutoliab(autoliabPayload);
      if (!bundle) {
        this.store.logicalError.set(retsumErr ?? 'Unexpected response from GSTR-3B.');
        this.store.viewState.set('error');
        return;
      }
      this.store.autoliabBundle.set(bundle);
      this.store.retsaveForm.set(withComputedItcNet(form));
      this.store.cacheKey.set(key);
      this.store.viewState.set('success');
    } catch (err: unknown) {
      this.store.httpError.set(normalizeGstr3bHttpError(err));
      this.store.viewState.set('error');
    }
  }

  /** Section editors: ensure retsave form is loaded. */
  async ensureRetsaveForm(
    gstin: string,
    retPeriod: string,
    filingLabel = '',
  ): Promise<void> {
    if (
      this.store.cacheKey() === gstr3bWorkspaceCacheKey(gstin, retPeriod) &&
      this.store.viewState() === 'success'
    ) {
      return;
    }
    await this.load(gstin, retPeriod, filingLabel);
  }
}
