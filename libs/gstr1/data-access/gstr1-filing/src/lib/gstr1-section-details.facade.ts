import { inject, Injectable, signal } from '@angular/core';
import {
  Gstr1ApiService,
  RETURN_PERIOD_REGEX,
  coerceGstr1DownloadApiName,
  extractGstr1DownloadMessageArray,
  isGstr1DownloadSuccessEnvelope,
  type Gstr1DownloadApiName,
  type Gstr1GstzenDownloadApiName,
} from '@ramsoft-builder/gstr1/data-access/gstzen-auth';
import {
  normalizeGstzenHttpError,
  type GstzenHttpErrorEnvelope,
} from '@ramsoft-builder/gstr1/utils/http-error';
import { firstValueFrom } from 'rxjs';
import type { Gstr1SectionDetailRow } from './gstr1-return-section.model';

export type Gstr1SectionViewState = 'idle' | 'loading' | 'success' | 'empty' | 'error';

/**
 * Download + table state for `Gstr1ReturnSectionDetailsPageComponent`.
 * Row mapping stays in feature mappers; this facade owns API calls and signals.
 */
@Injectable({ providedIn: 'root' })
export class Gstr1SectionDetailsFacade {
  private readonly gstr1Api = inject(Gstr1ApiService);

  readonly gstin = signal('');
  readonly retPeriod = signal('');
  readonly apiName = signal<Gstr1DownloadApiName>('b2b');

  readonly viewState = signal<Gstr1SectionViewState>('idle');
  readonly rawResponse = signal<unknown>(null);
  readonly apiRows = signal<unknown[]>([]);
  readonly localRows = signal<Gstr1SectionDetailRow[]>([]);
  readonly httpError = signal<GstzenHttpErrorEnvelope | unknown>(null);

  readonly isDocIssueOnly = (): boolean => this.apiName() === 'doc_issue';

  setRouteParams(apiName: string, gstin: string, retPeriod: string): void {
    const api = coerceGstr1DownloadApiName(apiName);
    this.apiName.set(api ?? 'b2b');
    this.gstin.set(gstin.trim().toUpperCase());
    this.retPeriod.set(retPeriod.trim());
  }

  readonly paramsValid = (): boolean =>
    this.gstin().length === 15 &&
    RETURN_PERIOD_REGEX.test(this.retPeriod()) &&
    this.apiName() !== 'retsum';

  async downloadSection(): Promise<void> {
    if (!this.paramsValid() || this.isDocIssueOnly()) {
      this.viewState.set(this.isDocIssueOnly() ? 'empty' : 'idle');
      return;
    }
    this.viewState.set('loading');
    this.httpError.set(null);
    try {
      const res = await firstValueFrom(
        this.gstr1Api.downloadGstr1Return({
          gstin: this.gstin(),
          ret_period: this.retPeriod(),
          api_name: this.apiName() as Gstr1GstzenDownloadApiName,
        }),
      );
      this.rawResponse.set(res);
      if (!isGstr1DownloadSuccessEnvelope(res)) {
        this.viewState.set('error');
        this.apiRows.set([]);
        return;
      }
      const rows = extractGstr1DownloadMessageArray(res, this.apiName());
      this.apiRows.set(rows);
      this.viewState.set(rows.length > 0 ? 'success' : 'empty');
    } catch (err: unknown) {
      this.httpError.set(normalizeGstzenHttpError(err));
      this.viewState.set('error');
      this.apiRows.set([]);
    }
  }

  mergeLocalRows(mapped: Gstr1SectionDetailRow[]): void {
    this.localRows.set(mapped);
  }
}
