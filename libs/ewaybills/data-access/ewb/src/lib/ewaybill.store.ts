import { computed, inject, Injectable, signal } from '@angular/core';
import { AuthStore } from '@ramsoft-builder/auth/data-access/auth';
import type {
  EwbCancelReasonCode,
  EwbGenerateRequest,
  EwbGenerateSuccess,
  EwaybillListView,
} from '@ramsoft-builder/ewaybills/models/ewb';
import {
  readFinancialYearKeyBrowser,
  sanitizeUndefinedDeep,
  splitPersistParts,
} from '@ramsoft-builder/ewaybills/utils/core';
import { firstValueFrom } from 'rxjs';
import { EwaybillRepository } from './ewaybill.repository';
import { EwbGstZenApiError } from './gstzen-ewb-api.error';
import { GstZenEwbApiService } from './gstzen-ewb-api.service';

function messageFromUnknown(err: unknown, fallback: string): string {
  if (err instanceof EwbGstZenApiError) {
    return err.message;
  }
  if (err instanceof Error) {
    const m = err.message.trim();
    return m || fallback;
  }
  if (typeof err === 'string' && err.trim()) {
    return err.trim();
  }
  if (err && typeof err === 'object') {
    const o = err as Record<string, unknown>;
    for (const k of ['message', 'details', 'hint', 'error_description']) {
      const v = o[k];
      if (typeof v === 'string' && v.trim()) {
        return v.trim();
      }
    }
  }
  return fallback;
}

export type EwaybillCreateStatus = 'idle' | 'loading' | 'success' | 'error';
export type EwaybillCancelStatus = 'idle' | 'loading' | 'success' | 'error';

export interface EwaybillCancelInput {
  id: string;
  ewbNo: string;
  cancelRsnCode: EwbCancelReasonCode;
  cancelRmrk?: string;
  fromGstin?: string;
}

@Injectable({ providedIn: 'root' })
export class EwaybillStore {
  private readonly api = inject(GstZenEwbApiService);
  private readonly repo = inject(EwaybillRepository);
  private readonly authStore = inject(AuthStore);

  readonly status = signal<EwaybillCreateStatus>('idle');
  readonly errorMessage = signal<string | null>(null);
  readonly lastSuccess = signal<EwbGenerateSuccess | null>(null);
  readonly lastInsertedId = signal<string | null>(null);
  readonly list = signal<EwaybillListView[]>([]);
  readonly listLoading = signal(false);
  readonly listError = signal<string | null>(null);

  readonly cancelStatus = signal<EwaybillCancelStatus>('idle');
  readonly cancelError = signal<string | null>(null);
  readonly cancelingId = signal<string | null>(null);

  readonly lastEwbNo = computed(() => this.lastSuccess()?.ewbNo ?? null);

  reset(): void {
    this.status.set('idle');
    this.errorMessage.set(null);
    this.lastSuccess.set(null);
    this.lastInsertedId.set(null);
  }

  dismissSubmissionError(): void {
    if (this.status() === 'error') {
      this.status.set('idle');
      this.errorMessage.set(null);
    }
  }

  async loadList(): Promise<void> {
    const uid = this.authStore.user()?.id;
    if (!uid) {
      this.list.set([]);
      return;
    }
    this.listError.set(null);
    this.listLoading.set(true);
    try {
      const rows = await this.repo.listForUser(uid);
      this.list.set(rows);
    } catch (e) {
      this.listError.set(
        e instanceof Error ? e.message : 'Failed to load e-way bills.',
      );
    } finally {
      this.listLoading.set(false);
    }
  }

  async createEwaybill(request: EwbGenerateRequest): Promise<void> {
    if (this.status() === 'loading') {
      return;
    }
    this.errorMessage.set(null);
    this.lastSuccess.set(null);
    this.lastInsertedId.set(null);
    this.status.set('loading');
    try {
      const res = await firstValueFrom(this.api.generate(request));
      this.lastSuccess.set(res);
      const uid = this.authStore.user()?.id;
      if (uid) {
        const parts = splitPersistParts(request);
        const insertRow = {
          ewb_number: res.ewbNo,
          invoice_details: sanitizeUndefinedDeep(
            parts.invoice_details,
          ) as Record<string, unknown>,
          transporter_details: sanitizeUndefinedDeep(
            parts.transporter_details,
          ) as Record<string, unknown>,
          vehicle_details: sanitizeUndefinedDeep(
            parts.vehicle_details,
          ) as Record<string, unknown>,
          request_payload: sanitizeUndefinedDeep(
            parts.request as unknown as Record<string, unknown>,
          ) as Record<string, unknown>,
          generated_response: sanitizeUndefinedDeep(res.raw) as Record<string, unknown>,
          status: 'generated' as const,
        };
        const { id } = await this.repo.insertGenerated(uid, insertRow);
        this.lastInsertedId.set(id);
        const fy = readFinancialYearKeyBrowser();
        await this.repo.bumpDashboardEwaybillCount(uid, fy);
        await this.loadList();
      }
      this.status.set('success');
    } catch (err) {
      this.status.set('error');
      this.errorMessage.set(
        messageFromUnknown(err, 'E-way bill submission failed.'),
      );
      throw err;
    }
  }

  async updateEwaybillMeta(
    id: string,
    patch: Parameters<EwaybillRepository['updateById']>[2],
  ): Promise<void> {
    const uid = this.authStore.user()?.id;
    if (!uid) {
      return;
    }
    await this.repo.updateById(uid, id, patch);
    await this.loadList();
  }

  dismissCancelError(): void {
    if (this.cancelStatus() === 'error') {
      this.cancelStatus.set('idle');
      this.cancelError.set(null);
    }
  }

  async cancelEwaybill(input: EwaybillCancelInput): Promise<void> {
    if (this.cancelStatus() === 'loading') {
      return;
    }
    this.cancelError.set(null);
    this.cancelStatus.set('loading');
    this.cancelingId.set(input.id);
    try {
      const res = await firstValueFrom(
        this.api.cancel(
          {
            ewbNo: input.ewbNo,
            cancelRsnCode: input.cancelRsnCode,
            cancelRmrk: input.cancelRmrk?.trim() || undefined,
          },
          input.fromGstin,
        ),
      );
      const uid = this.authStore.user()?.id;
      if (uid) {
        await this.repo.updateById(uid, input.id, {
          status: 'cancelled',
          cancel_response: sanitizeUndefinedDeep(res.raw) as Record<string, unknown>,
          cancel_reason: input.cancelRmrk?.trim() || null,
          cancelled_at: new Date().toISOString(),
        });
        await this.loadList();
      }
      this.cancelStatus.set('success');
    } catch (err) {
      this.cancelStatus.set('error');
      this.cancelError.set(
        messageFromUnknown(err, 'E-way bill cancellation failed.'),
      );
    } finally {
      this.cancelingId.set(null);
    }
  }
}
