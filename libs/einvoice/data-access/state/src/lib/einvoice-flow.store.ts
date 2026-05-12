import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { AuthStore } from '@ramsoft-builder/auth/data-access/auth';
import {
  EinvoiceApiService,
  EinvoiceEnterpriseApiError,
  EwaybillApiService,
} from '@ramsoft-builder/einvoice/data-access/api';
import { EinvoiceRepository } from '@ramsoft-builder/einvoice/data-access/persistence';
import type {
  EinvoiceGenerateRequest,
  EinvoiceGenerateResponse,
} from '@ramsoft-builder/einvoice/models/nic';
import { outboxDocKey, outboxEnqueue } from '@ramsoft-builder/einvoice/utils/core';
import { firstValueFrom } from 'rxjs';

export type EinvoiceFlowStatus = 'idle' | 'loading' | 'success' | 'error';

const initialState = {
  mode: 'irn' as 'irn' | 'irn-ewb',
  status: 'idle' as EinvoiceFlowStatus,
  errorMessage: null as string | null,
  lastResponse: null as EinvoiceGenerateResponse | null,
  lastRequest: null as EinvoiceGenerateRequest | null,
};

export const EinvoiceFlowStore = signalStore(
  withState(initialState),
  withComputed(({ lastResponse }) => ({
    irn: computed(() => lastResponse()?.Irn?.trim() ?? ''),
    ackNo: computed(() => lastResponse()?.AckNo ?? ''),
    signedQr: computed(() => lastResponse()?.SignedQRCode ?? ''),
    ewbNo: computed(() => lastResponse()?.EwbNo ?? ''),
    ewbValidTill: computed(() => lastResponse()?.EwbValidTill ?? ''),
  })),
  withMethods((store) => {
    const api = inject(EinvoiceApiService);
    const ewbApi = inject(EwaybillApiService);
    const repo = inject(EinvoiceRepository);
    const auth = inject(AuthStore);
    return {
      setMode(mode: 'irn' | 'irn-ewb'): void {
        patchState(store, { mode });
      },
      dismissSubmissionError(): void {
        if (store.status() === 'error') {
          patchState(store, { status: 'idle', errorMessage: null });
        }
      },
      reset(): void {
        patchState(store, {
          mode: store.mode(),
          status: 'idle',
          errorMessage: null,
          lastResponse: null,
          lastRequest: null,
        });
      },
      async submit(request: EinvoiceGenerateRequest): Promise<void> {
        if (store.status() === 'loading') {
          return;
        }
        const mode = store.mode();
        patchState(store, {
          status: 'loading',
          errorMessage: null,
          lastResponse: null,
          lastRequest: request,
        });
        try {
          const obs =
            mode === 'irn' ? api.generateIrn(request) : ewbApi.generateIrnWithEwayBill(request);
          const res = await firstValueFrom(obs);
          patchState(store, { lastResponse: res });
          const uid = auth.user()?.id;
          if (uid) {
            await repo.saveGenerated(uid, request, res);
          }
          patchState(store, { status: 'success' });
        } catch (err: unknown) {
          const message =
            err instanceof EinvoiceEnterpriseApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : 'E-invoice submission failed.';
          patchState(store, { status: 'error', errorMessage: message });
          try {
            await outboxEnqueue({
              id: `${mode}-${outboxDocKey(request)}-${Date.now()}`,
              createdAt: Date.now(),
              mode,
              request,
            });
          } catch {
            /* IndexedDB unavailable */
          }
          throw err;
        }
      },
    };
  }),
);
