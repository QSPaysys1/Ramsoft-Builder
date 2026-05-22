import { inject, Injectable, signal } from '@angular/core';
import {
  Gstr1ApiService,
  RETURN_PERIOD_REGEX,
  coerceGstr1DownloadApiName,
  extractGstr1RetsumSecSum,
  isGstr1DownloadSuccessEnvelope,
  mapGstr1RetsumSecSumToPortalTileCounts,
  type Gstr1DownloadApiName,
} from '@ramsoft-builder/gstr1/data-access/gstzen-auth';
import {
  normalizeGstzenHttpError,
  type GstzenHttpErrorEnvelope,
} from '@ramsoft-builder/gstr1/utils/http-error';
import { firstValueFrom } from 'rxjs';

export type Gstr1WorkspaceFetchState = 'idle' | 'loading' | 'success' | 'error';

/**
 * GSTR-1 download workspace hub state (RETSUM summary, tile counts, proceed-to-file helpers).
 * Query-param sync remains in `Gstr1DownloadReturnPageComponent`.
 */
@Injectable({ providedIn: 'root' })
export class Gstr1WorkspaceStore {
  private readonly gstr1Api = inject(Gstr1ApiService);

  readonly gstin = signal('');
  readonly retPeriod = signal('');
  readonly apiName = signal<Gstr1DownloadApiName>('retsum');
  readonly filingStatusLabel = signal('');
  readonly dueDateLabel = signal('');

  readonly fetchState = signal<Gstr1WorkspaceFetchState>('idle');
  readonly retsumSecSum = signal<readonly Record<string, unknown>[]>([]);
  readonly retsumTileCounts = signal<readonly number[]>([]);
  readonly rawResponse = signal<unknown>(null);
  readonly httpError = signal<GstzenHttpErrorEnvelope | unknown>(null);

  setRouteContext(input: {
    gstin: string;
    retPeriod: string;
    apiName?: string | null;
    filingStatus?: string | null;
    dueDate?: string | null;
  }): void {
    this.gstin.set(input.gstin.trim().toUpperCase());
    this.retPeriod.set(input.retPeriod.trim());
    const api = coerceGstr1DownloadApiName(input.apiName);
    if (api) {
      this.apiName.set(api);
    }
    if (input.filingStatus) {
      this.filingStatusLabel.set(input.filingStatus);
    }
    if (input.dueDate) {
      this.dueDateLabel.set(input.dueDate);
    }
  }

  readonly paramsValid = (): boolean =>
    this.gstin().length === 15 && RETURN_PERIOD_REGEX.test(this.retPeriod());

  async fetchRetsumSummary(): Promise<void> {
    if (!this.paramsValid()) {
      return;
    }
    this.fetchState.set('loading');
    this.httpError.set(null);
    try {
      const res = await firstValueFrom(
        this.gstr1Api.downloadGstr1Return({
          gstin: this.gstin(),
          ret_period: this.retPeriod(),
          api_name: 'retsum',
        }),
      );
      this.rawResponse.set(res);
      if (!isGstr1DownloadSuccessEnvelope(res)) {
        this.fetchState.set('error');
        this.retsumSecSum.set([]);
        this.retsumTileCounts.set([]);
        return;
      }
      const secSum = extractGstr1RetsumSecSum(res) as readonly Record<string, unknown>[];
      this.retsumSecSum.set(secSum);
      this.retsumTileCounts.set(mapGstr1RetsumSecSumToPortalTileCounts(secSum));
      this.fetchState.set('success');
    } catch (err: unknown) {
      this.httpError.set(normalizeGstzenHttpError(err));
      this.fetchState.set('error');
      this.retsumSecSum.set([]);
      this.retsumTileCounts.set([]);
    }
  }

  async resetProceedToFile(): Promise<unknown> {
    return firstValueFrom(
      this.gstr1Api.resetGstr1Proceed({
        gstin: this.gstin(),
        ret_period: this.retPeriod(),
      }),
    );
  }

  async retsaveNil(payload: Record<string, unknown>): Promise<unknown> {
    return firstValueFrom(this.gstr1Api.retsaveGstr1Return(payload));
  }
}
