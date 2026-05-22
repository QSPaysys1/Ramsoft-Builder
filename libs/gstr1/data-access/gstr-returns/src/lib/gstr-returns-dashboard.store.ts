import { inject, Injectable, signal } from '@angular/core';
import {
  GstrReturnsApiService,
  filedListFromPayload,
  topLevelPayloadError,
} from '@ramsoft-builder/gstr1/data-access/gstzen-auth';
import {
  normalizeGstzenHttpError,
  type GstzenHttpErrorEnvelope,
} from '@ramsoft-builder/gstr1/utils/http-error';
import { firstValueFrom } from 'rxjs';

/**
 * Rettrack search state for the returns dashboard (`POST rettrack/`).
 * Period/GSTIN selection lives in {@link GstrReturnPeriodStore}.
 */
@Injectable({ providedIn: 'root' })
export class GstrReturnsDashboardStore {
  private readonly returnsApi = inject(GstrReturnsApiService);

  readonly loading = signal(false);
  readonly payloadOk = signal<boolean | null>(null);
  readonly rawPayload = signal<unknown>(null);
  readonly httpError = signal<GstzenHttpErrorEnvelope | unknown>(null);
  readonly lastSearchLabel = signal('');

  readonly filedRows = signal<Record<string, unknown>[]>([]);

  resetResponse(): void {
    this.payloadOk.set(null);
    this.rawPayload.set(null);
    this.httpError.set(null);
    this.filedRows.set([]);
  }

  /**
   * Runs `viewAndTrackReturns` for the given GSTIN and tax period.
   * Updates {@link filedRows} when the envelope is valid.
   */
  async search(gstin: string, retPeriod: string, searchLabel: string): Promise<void> {
    if (this.loading()) {
      return;
    }
    const g = gstin.trim().toUpperCase();
    const ret_period = retPeriod.trim();

    this.loading.set(true);
    this.resetResponse();

    try {
      const payload = await firstValueFrom(
        this.returnsApi.viewAndTrackReturns({ gstin: g, ret_period }),
      );
      const topErr = topLevelPayloadError(payload);
      if (topErr) {
        this.payloadOk.set(false);
        this.rawPayload.set(payload);
        this.httpError.set({ message: topErr });
        this.lastSearchLabel.set(searchLabel);
        this.filedRows.set([]);
        return;
      }
      this.payloadOk.set(true);
      this.rawPayload.set(payload);
      this.filedRows.set(filedListFromPayload(payload));
      this.lastSearchLabel.set(searchLabel);
    } catch (err: unknown) {
      this.payloadOk.set(false);
      this.httpError.set(normalizeGstzenHttpError(err));
      this.lastSearchLabel.set(searchLabel);
      this.filedRows.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}
