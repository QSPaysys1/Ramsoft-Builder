import { inject, Injectable, signal } from '@angular/core';
import { Gstr1ApiService, Gstr1aApiService } from '@ramsoft-builder/gstr1/data-access/gstzen-auth';
import {
  normalizeGstzenHttpError,
  type GstzenHttpErrorEnvelope,
} from '@ramsoft-builder/gstr1/utils/http-error';
import { firstValueFrom } from 'rxjs';

export type Gstr1RetsaveViewState = 'idle' | 'submitting' | 'success' | 'error';

/**
 * Base retsave flow for GSTR-1 / GSTR-1A section pages.
 * Subclass or compose per section to supply `buildRetsavePayload()`.
 */
@Injectable()
export abstract class Gstr1RetsaveFacade {
  protected readonly gstr1Api = inject(Gstr1ApiService);
  protected readonly gstr1aApi = inject(Gstr1aApiService);

  readonly saveSubmitting = signal(false);
  readonly saveError = signal<GstzenHttpErrorEnvelope | unknown>(null);
  readonly saveSuccessPayload = signal<unknown>(null);
  readonly saveViewState = signal<Gstr1RetsaveViewState>('idle');

  protected abstract buildRetsavePayload(): Record<string, unknown> | null;

  /** When true, POST to `api/gstr1a/retsave/` instead of `api/gstr1/retsave/`. */
  protected abstract isGstr1aWorkspace(): boolean;

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
      const req = this.isGstr1aWorkspace()
        ? this.gstr1aApi.retsaveGstr1aReturn(payload)
        : this.gstr1Api.retsaveGstr1Return(payload);
      const res = await firstValueFrom(req);
      this.saveSuccessPayload.set(res);
      this.saveViewState.set('success');
    } catch (err: unknown) {
      this.saveError.set(normalizeGstzenHttpError(err));
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
}
