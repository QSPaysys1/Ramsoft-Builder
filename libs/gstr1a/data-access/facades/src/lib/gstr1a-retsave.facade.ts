import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Gstr1aApiService } from '@ramsoft-builder/gstr1a/data-access/api';
import {
  normalizeGstr1aHttpError,
  type GstzenHttpErrorEnvelope,
} from '@ramsoft-builder/gstr1a/data-access/services';
import type { Gstr1aRetsaveViewState } from '@ramsoft-builder/gstr1a/models/enums';
import { isGstr1DownloadSuccessEnvelope } from '@ramsoft-builder/gstr1a/utils/mappers';
import type { Gstr1aDownloadApiName } from '@ramsoft-builder/gstr1a/models/entities';

/**
 * Shared retsave submit for GSTR-1A section pages.
 * Subclasses supply `buildRetsavePayload()`.
 */
@Injectable()
export abstract class Gstr1aRetsaveFacade {
  protected readonly api = inject(Gstr1aApiService);

  readonly saveSubmitting = signal(false);
  readonly saveError = signal<GstzenHttpErrorEnvelope | unknown>(null);
  readonly saveSuccessPayload = signal<unknown>(null);
  readonly saveViewState = signal<Gstr1aRetsaveViewState>('idle');

  protected abstract buildRetsavePayload(): Record<string, unknown> | null;

  async submit(): Promise<void> {
    const payload = this.buildRetsavePayload();
    if (!payload) {
      return;
    }
    this.saveSubmitting.set(true);
    this.saveError.set(null);
    this.saveSuccessPayload.set(null);
    this.saveViewState.set('submitting');
    try {
      const res = await firstValueFrom(this.api.retsaveGstr1aReturn(payload));
      this.saveSuccessPayload.set(res);
      this.saveViewState.set('success');
    } catch (err: unknown) {
      this.saveError.set(normalizeGstr1aHttpError(err));
      this.saveViewState.set('error');
    } finally {
      this.saveSubmitting.set(false);
    }
  }

  resetSaveState(): void {
    this.saveSubmitting.set(false);
    this.saveError.set(null);
    this.saveSuccessPayload.set(null);
    this.saveViewState.set('idle');
  }

  /** Extract retsave section bucket from last download envelope. */
  protected sectionFromDownload(
    raw: unknown,
    apiName: Gstr1aDownloadApiName,
  ): unknown | null {
    if (!isGstr1DownloadSuccessEnvelope(raw)) {
      return null;
    }
    const msg = raw.message as Record<string, unknown>;
    const bucket = msg[apiName];
    if (bucket === undefined || bucket === null) {
      return null;
    }
    if (Array.isArray(bucket)) {
      return bucket.length > 0 ? bucket : null;
    }
    if (typeof bucket === 'object') {
      return Object.keys(bucket as object).length > 0 ? bucket : null;
    }
    return null;
  }
}
