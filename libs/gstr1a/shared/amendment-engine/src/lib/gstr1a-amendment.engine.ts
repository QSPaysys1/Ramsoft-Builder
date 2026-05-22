import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Gstr1ApiService } from '@ramsoft-builder/gstr1/data-access/gstzen-auth';
import { Gstr1aApiService } from '@ramsoft-builder/gstr1a/data-access/api';
import type { Gstr1aDownloadApiName } from '@ramsoft-builder/gstr1a/models/entities';
import {
  extractGstr1DownloadMessageArray,
  isGstr1DownloadSuccessEnvelope,
} from '@ramsoft-builder/gstr1a/utils/mappers';
import { computeInvoiceFieldDiffs } from '@ramsoft-builder/gstr1a/utils/diff-utils';

export interface Gstr1aAmendmentPair {
  readonly originalApi: 'b2b' | 'b2cl' | 'exp' | 'cdnr' | 'cdnur' | 'b2cs' | 'at' | 'txp' | 'ecom' | 'supeco';
  readonly amendApi: Gstr1aDownloadApiName;
}

const PRIMARY_FOR_AMEND: Partial<Record<Gstr1aDownloadApiName, Gstr1aAmendmentPair['originalApi']>> = {
  b2ba: 'b2b',
  b2cla: 'b2cl',
  b2csa: 'b2cs',
  expa: 'exp',
  cdnra: 'cdnr',
  cdnura: 'cdnur',
  ata: 'at',
  txpa: 'txp',
  ecoma: 'ecom',
  supecoa: 'supeco',
};

/**
 * Fetches original (GSTR-1) and amended (GSTR-1A) buckets and builds field diffs.
 */
@Injectable({ providedIn: 'root' })
export class Gstr1aAmendmentEngine {
  private readonly gstr1Api = inject(Gstr1ApiService);
  private readonly gstr1aApi = inject(Gstr1aApiService);

  async fetchOriginal(
    gstin: string,
    retPeriod: string,
    amendApi: Gstr1aDownloadApiName,
  ): Promise<unknown> {
    const primary = PRIMARY_FOR_AMEND[amendApi];
    if (!primary) {
      return null;
    }
    return firstValueFrom(
      this.gstr1Api.downloadGstr1Return({
        gstin,
        ret_period: retPeriod,
        api_name: primary,
      }),
    );
  }

  async fetchAmendment(
    gstin: string,
    retPeriod: string,
    amendApi: Gstr1aDownloadApiName,
  ): Promise<unknown> {
    return firstValueFrom(
      this.gstr1aApi.downloadGstr1aReturn({ gstin, ret_period: retPeriod, api_name: amendApi }),
    );
  }

  /** Builds per-invoice diff summaries from raw download envelopes. */
  buildDiffs(
    originalRaw: unknown,
    amendedRaw: unknown,
    amendApi: Gstr1aDownloadApiName,
  ): ReturnType<typeof computeInvoiceFieldDiffs>[] {
    const primary = PRIMARY_FOR_AMEND[amendApi] ?? amendApi;
    if (!isGstr1DownloadSuccessEnvelope(originalRaw) || !isGstr1DownloadSuccessEnvelope(amendedRaw)) {
      return [];
    }
    const origRows = extractGstr1DownloadMessageArray(originalRaw, primary);
    const amendRows = extractGstr1DownloadMessageArray(amendedRaw, amendApi);
    const diffs: ReturnType<typeof computeInvoiceFieldDiffs>[] = [];
    const max = Math.max(origRows.length, amendRows.length);
    for (let i = 0; i < max; i++) {
      const o = origRows[i];
      const a = amendRows[i];
      const oRec = o && typeof o === 'object' ? (o as Record<string, unknown>) : null;
      const aRec = a && typeof a === 'object' ? (a as Record<string, unknown>) : null;
      const key = String(aRec?.['oinum'] ?? aRec?.['inum'] ?? i);
      const ctin = String(oRec?.['ctin'] ?? aRec?.['ctin'] ?? '');
      diffs.push(computeInvoiceFieldDiffs(oRec, aRec, key, ctin));
    }
    return diffs;
  }
}
