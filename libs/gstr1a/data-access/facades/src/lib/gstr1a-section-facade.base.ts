import { inject } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { Gstr1aApiService } from '@ramsoft-builder/gstr1a/data-access/api';
import { normalizeGstr1aHttpError } from '@ramsoft-builder/gstr1a/data-access/services';
import { Gstr1aSectionStoreBase } from '@ramsoft-builder/gstr1a/data-access/stores';
import type { Gstr1aDownloadApiName } from '@ramsoft-builder/gstr1a/models/entities';
import {
  aggregateGstr1DownloadRows,
  extractGstr1DownloadMessageArray,
  flattenGstr1DownloadHierarchy,
  isGstr1DownloadSuccessEnvelope,
  parseGstr1DownloadHierarchy,
} from '@ramsoft-builder/gstr1a/utils/mappers';

/**
 * Orchestrates GSTR-1A section load: validate → download → map hierarchy → store.
 */
export abstract class Gstr1aSectionFacadeBase {
  protected readonly api = inject(Gstr1aApiService);
  protected abstract readonly store: Gstr1aSectionStoreBase;
  protected abstract readonly sectionApi: Gstr1aDownloadApiName;

  async load(gstin: string, retPeriod: string, filingLabel = ''): Promise<void> {
    this.store.setContext(gstin, retPeriod, filingLabel);
    if (!this.store.paramsValid() || this.store.viewState() === 'loading') {
      return;
    }
    this.store.resetForLoad();
    try {
      const raw = await firstValueFrom(
        this.api.downloadGstr1aReturn({
          gstin,
          ret_period: retPeriod,
          api_name: this.sectionApi,
        }),
      );
      this.store.rawResponse.set(raw);
      if (!isGstr1DownloadSuccessEnvelope(raw)) {
        this.store.logicalError.set('Download did not return success.');
        this.store.viewState.set('error');
        return;
      }
      const bucket = extractGstr1DownloadMessageArray(raw, this.sectionApi);
      if (bucket.length === 0) {
        this.store.hierarchy.set([]);
        this.store.aggregate.set({
          sourceBucketLength: 0,
          totalLineItems: 0,
          invoiceCount: 0,
          ctinCount: 0,
          taxableTotal: 0,
          igstTotal: 0,
          cgstTotal: 0,
          sgstTotal: 0,
          cessTotal: 0,
          taxGrandTotal: 0,
        });
        this.store.viewState.set('empty');
        return;
      }
      const hierarchy = parseGstr1DownloadHierarchy(bucket);
      const flat = flattenGstr1DownloadHierarchy(hierarchy);
      this.store.hierarchy.set(hierarchy);
      this.store.aggregate.set(aggregateGstr1DownloadRows(flat, bucket.length));
      this.store.viewState.set(hierarchy.length > 0 ? 'success' : 'empty');
    } catch (err: unknown) {
      this.store.httpError.set(normalizeGstr1aHttpError(err));
      this.store.viewState.set('error');
    }
  }

  protected fetch$(gstin: string, retPeriod: string): Observable<unknown> {
    return this.api.downloadGstr1aReturn({
      gstin,
      ret_period: retPeriod,
      api_name: this.sectionApi,
    });
  }
}
