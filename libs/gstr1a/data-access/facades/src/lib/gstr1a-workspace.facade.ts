import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Gstr1aApiService } from '@ramsoft-builder/gstr1a/data-access/api';
import { normalizeGstr1aHttpError } from '@ramsoft-builder/gstr1a/data-access/services';
import { Gstr1aWorkspaceStore } from '@ramsoft-builder/gstr1a/data-access/stores';
import { gstr1aWorkspaceCacheKey } from '@ramsoft-builder/gstr1a/shared/caching';
import {
  extractGstr1RetsumSecSum,
  isGstr1DownloadSuccessEnvelope,
  mapGstr1RetsumSecSumToPortalTileCounts,
} from '@ramsoft-builder/gstr1a/utils/mappers';

/** Hub load: POST gstr1a/download retsum for portal tile counts. */
@Injectable({ providedIn: 'root' })
export class Gstr1aWorkspaceFacade {
  private readonly api = inject(Gstr1aApiService);
  readonly store = inject(Gstr1aWorkspaceStore);

  async loadRetsum(
    gstin: string,
    retPeriod: string,
    filingLabel = '',
    force = false,
  ): Promise<void> {
    this.store.setContext(gstin, retPeriod, filingLabel);
    const key = gstr1aWorkspaceCacheKey(gstin, retPeriod);
    if (!force && this.store.cacheKey() === key && this.store.viewState() === 'success') {
      return;
    }
    if (this.store.viewState() === 'loading') {
      return;
    }
    this.store.resetForLoad();
    try {
      const raw = await firstValueFrom(
        this.api.downloadGstr1aReturn({
          gstin,
          ret_period: retPeriod,
          api_name: 'retsum',
        }),
      );
      this.store.retsumPayload.set(raw);
      if (!isGstr1DownloadSuccessEnvelope(raw)) {
        this.store.logicalError.set('Return summary download failed.');
        this.store.viewState.set('error');
        return;
      }
      const secSum = extractGstr1RetsumSecSum(raw);
      this.store.portalTileCounts.set(mapGstr1RetsumSecSumToPortalTileCounts(secSum));
      this.store.cacheKey.set(key);
      this.store.viewState.set('success');
    } catch (err: unknown) {
      this.store.httpError.set(normalizeGstr1aHttpError(err));
      this.store.viewState.set('error');
    }
  }
}
