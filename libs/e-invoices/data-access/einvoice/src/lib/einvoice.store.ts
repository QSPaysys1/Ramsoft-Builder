import { computed, inject, Injectable, signal } from '@angular/core';
import { AuthStore } from '@ramsoft-builder/auth/data-access/auth';
import { firstValueFrom } from 'rxjs';
import { EinvoiceApiError } from './einvoice-api-error';
import { EinvoicePersistenceService } from './einvoice-persistence.service';
import { EinvoiceService } from './einvoice.service';
import type {
  EinvoiceGenerateRequest,
  EinvoiceGenerateResponse,
} from './models/einvoice-nic.models';

export type EinvoiceCreateStatus = 'idle' | 'loading' | 'success' | 'error';

@Injectable({ providedIn: 'root' })
export class EinvoiceStore {
  private readonly einvoiceService = inject(EinvoiceService);
  private readonly persistence = inject(EinvoicePersistenceService);
  private readonly authStore = inject(AuthStore);

  readonly status = signal<EinvoiceCreateStatus>('idle');
  readonly errorMessage = signal<string | null>(null);
  readonly lastResponse = signal<EinvoiceGenerateResponse | null>(null);

  readonly lastIrn = computed(() => this.lastResponse()?.Irn?.trim() ?? null);
  readonly lastAckNo = computed(() => this.lastResponse()?.AckNo ?? null);

  reset(): void {
    this.status.set('idle');
    this.errorMessage.set(null);
    this.lastResponse.set(null);
  }

  /** Clears a failed submission so the user can fix the form and retry without stale red banner. */
  dismissSubmissionError(): void {
    if (this.status() === 'error') {
      this.status.set('idle');
      this.errorMessage.set(null);
    }
  }

  async createInvoice(request: EinvoiceGenerateRequest): Promise<void> {
    if (this.status() === 'loading') {
      return;
    }
    this.errorMessage.set(null);
    this.lastResponse.set(null);
    this.status.set('loading');
    try {
      const res = await firstValueFrom(
        this.einvoiceService.generateEinvoice(request),
      );
      this.lastResponse.set(res);
      const uid = this.authStore.user()?.id;
      if (uid) {
        await this.persistence.saveGeneratedInvoice(uid, request, res);
      }
      this.status.set('success');
    } catch (err) {
      this.status.set('error');
      const message =
        err instanceof EinvoiceApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'E-invoice submission failed.';
      this.errorMessage.set(message);
      throw err;
    }
  }
}
