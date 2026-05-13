import { computed, inject, Injectable, signal, type WritableSignal } from '@angular/core';
import { AuthStore } from '@ramsoft-builder/auth/data-access/auth';
import type {
  EwbCancelReasonCode,
  EwbExtendRequest,
  EwbExtendSuccess,
  EwbGenerateRequest,
  EwbGenerateSuccess,
  EwbMvGroupPostRequest,
  EwaybillListView,
  EwaybillDbRow,
  EwbUpdatePartBRequest,
  EwbUpdateTransporterRequest,
  EwbTransportAuditOp,
} from '@ramsoft-builder/ewaybills/models/ewb';
import { EWB_TRANSPORT_AUDIT_KIND_KEY } from '@ramsoft-builder/ewaybills/models/ewb';
import {
  readFinancialYearKeyBrowser,
  sanitizeUndefinedDeep,
  splitPersistParts,
} from '@ramsoft-builder/ewaybills/utils/core';
import { firstValueFrom, Observable } from 'rxjs';
import { EwaybillRepository } from './ewaybill.repository';
import { EwbGstZenApiError } from './gstzen-ewb-api.error';
import { GstZenEwbApiService } from './gstzen-ewb-api.service';

function messageFromUnknown(err: unknown, fallback: string): string {
  if (err instanceof EwbGstZenApiError) {
    let m = err.message;
    const b = err.body;
    if (b && typeof b === 'object' && !Array.isArray(b)) {
      const u = (b as Record<string, unknown>)['uuid'];
      if (typeof u === 'string' && u.trim()) {
        m = `${m} (GSTZen reference: ${u.trim()})`;
      }
    }
    return m;
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
export type EwaybillPartBStatus = 'idle' | 'loading' | 'success' | 'error';
export type EwaybillTransporterStatus = 'idle' | 'loading' | 'success' | 'error';
export type EwaybillExtendStatus = 'idle' | 'loading' | 'success' | 'error';

export interface EwaybillCancelInput {
  id: string;
  ewbNo: string;
  cancelRsnCode: EwbCancelReasonCode;
  cancelRmrk?: string;
  fromGstin?: string;
}

export interface EwaybillPartBSubmitInput {
  ewaybillId: string;
  body: EwbUpdatePartBRequest;
  fromGstin?: string;
}

export interface EwaybillTransporterSubmitInput {
  ewaybillId: string;
  body: EwbUpdateTransporterRequest;
  fromGstin?: string;
}

export interface EwaybillExtendSubmitInput {
  ewaybillId: string;
  body: EwbExtendRequest;
  fromGstin?: string;
}

export interface EwaybillMvGroupPostSubmitInput {
  ewaybillId: string;
  body: EwbMvGroupPostRequest;
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

  readonly partBStatus = signal<EwaybillPartBStatus>('idle');
  readonly partBError = signal<string | null>(null);
  readonly lastPartBApiResponse = signal<Record<string, unknown> | null>(null);

  readonly transporterStatus = signal<EwaybillTransporterStatus>('idle');
  readonly transporterError = signal<string | null>(null);
  readonly lastTransporterApiResponse = signal<Record<string, unknown> | null>(null);

  readonly extendStatus = signal<EwaybillExtendStatus>('idle');
  readonly extendError = signal<string | null>(null);
  readonly lastExtendApiResponse = signal<Record<string, unknown> | null>(null);

  readonly multiVehicleStatus = signal<EwaybillExtendStatus>('idle');
  readonly multiVehicleError = signal<string | null>(null);
  readonly lastMultiVehicleApiResponse = signal<Record<string, unknown> | null>(null);

  readonly mvGroupPostStatus = signal<EwaybillExtendStatus>('idle');
  readonly mvGroupPostError = signal<string | null>(null);
  readonly lastMvGroupPostApiResponse = signal<Record<string, unknown> | null>(null);

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

  dismissPartBError(): void {
    if (this.partBStatus() === 'error') {
      this.partBStatus.set('idle');
      this.partBError.set(null);
    }
  }

  resetPartBUi(): void {
    this.partBStatus.set('idle');
    this.partBError.set(null);
    this.lastPartBApiResponse.set(null);
  }

  dismissTransporterError(): void {
    if (this.transporterStatus() === 'error') {
      this.transporterStatus.set('idle');
      this.transporterError.set(null);
    }
  }

  resetTransporterUi(): void {
    this.transporterStatus.set('idle');
    this.transporterError.set(null);
    this.lastTransporterApiResponse.set(null);
  }

  dismissExtendError(): void {
    if (this.extendStatus() === 'error') {
      this.extendStatus.set('idle');
      this.extendError.set(null);
    }
  }

  dismissMultiVehicleError(): void {
    if (this.multiVehicleStatus() === 'error') {
      this.multiVehicleStatus.set('idle');
      this.multiVehicleError.set(null);
    }
  }

  resetExtendUi(): void {
    this.extendStatus.set('idle');
    this.extendError.set(null);
    this.lastExtendApiResponse.set(null);
  }

  resetMultiVehicleUi(): void {
    this.multiVehicleStatus.set('idle');
    this.multiVehicleError.set(null);
    this.lastMultiVehicleApiResponse.set(null);
  }

  dismissMvGroupPostError(): void {
    if (this.mvGroupPostStatus() === 'error') {
      this.mvGroupPostStatus.set('idle');
      this.mvGroupPostError.set(null);
    }
  }

  resetMvGroupPostUi(): void {
    this.mvGroupPostStatus.set('idle');
    this.mvGroupPostError.set(null);
    this.lastMvGroupPostApiResponse.set(null);
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

  async submitPartBUpdate(input: EwaybillPartBSubmitInput): Promise<void> {
    if (this.partBStatus() === 'loading') {
      return;
    }
    this.partBError.set(null);
    this.lastPartBApiResponse.set(null);
    this.partBStatus.set('loading');
    const uid = this.authStore.user()?.id;
    if (!uid) {
      this.partBStatus.set('error');
      this.partBError.set('Not signed in.');
      return;
    }
    let existing: EwaybillDbRow | null = null;
    try {
      existing = await this.repo.getById(uid, input.ewaybillId);
    } catch {
      /* ignore */
    }
    const veh = (existing?.vehicle_details ?? {}) as Record<string, unknown>;
    const reqp = (existing?.request_payload ?? {}) as Record<string, unknown>;
    const tr = (existing?.transporter_details ?? {}) as Record<string, unknown>;
    const vehicleBefore = String(
      (typeof veh['vehicleNo'] === 'string' ? veh['vehicleNo'] : '') ||
        (typeof reqp['vehicleNo'] === 'string' ? reqp['vehicleNo'] : '') ||
        '',
    )
      .toUpperCase()
      .replace(/\s+/g, '');
    const vehicleAfter = String(input.body.vehicleNo)
      .toUpperCase()
      .replace(/\s+/g, '');
    const vehicleChanged = !!vehicleAfter && vehicleAfter !== vehicleBefore;
    const prevCountRaw = existing?.transport_success_count;
    const prevCount =
      typeof prevCountRaw === 'number' && Number.isFinite(prevCountRaw)
        ? prevCountRaw
        : 0;

    try {
      const res = await firstValueFrom(
        this.api.updatePartB(input.body, input.fromGstin),
      );
      this.lastPartBApiResponse.set(res.raw);
      await this.repo.insertTransportUpdate(uid, {
        eway_bill_id: input.ewaybillId,
        request_payload: sanitizeUndefinedDeep(
          input.body as unknown as Record<string, unknown>,
        ) as Record<string, unknown>,
        response: sanitizeUndefinedDeep(res.raw) as Record<string, unknown>,
        status: 'success',
        vehicle_no_before: vehicleBefore || null,
        vehicle_no_after: vehicleAfter || null,
      });
      await this.repo.updateById(uid, input.ewaybillId, {
        transport_last_status: 'success',
        transport_last_at: new Date().toISOString(),
        transport_success_count: prevCount + 1,
        transport_last_vehicle_changed: vehicleChanged,
        vehicle_details: sanitizeUndefinedDeep({
          ...veh,
          vehicleNo: input.body.vehicleNo,
        }) as Record<string, unknown>,
        transporter_details: sanitizeUndefinedDeep({
          ...tr,
          transMode: input.body.transMode,
          transDocNo: input.body.transDocNo,
          transDocDate: input.body.transDocDate,
        }) as Record<string, unknown>,
      });
      await this.loadList();
      this.partBStatus.set('success');
    } catch (err) {
      const errMsg = messageFromUnknown(err, 'Update Part B failed.');
      this.partBError.set(errMsg);
      let errBody: Record<string, unknown> = { message: errMsg };
      if (err instanceof EwbGstZenApiError && err.body && typeof err.body === 'object') {
        errBody = err.body as Record<string, unknown>;
      }
      this.lastPartBApiResponse.set(errBody);
      try {
        await this.repo.insertTransportUpdate(uid, {
          eway_bill_id: input.ewaybillId,
          request_payload: sanitizeUndefinedDeep(
            input.body as unknown as Record<string, unknown>,
          ) as Record<string, unknown>,
          response: sanitizeUndefinedDeep(errBody) as Record<string, unknown>,
          status: 'failed',
          error_message: errMsg,
          vehicle_no_before: vehicleBefore || null,
          vehicle_no_after: vehicleAfter || null,
        });
        await this.repo.updateById(uid, input.ewaybillId, {
          transport_last_status: 'failed',
          transport_last_at: new Date().toISOString(),
        });
        await this.loadList();
      } catch {
        /* best-effort audit */
      }
      this.partBStatus.set('error');
    }
  }

  async submitTransporterUpdate(
    input: EwaybillTransporterSubmitInput,
  ): Promise<void> {
    if (this.transporterStatus() === 'loading') {
      return;
    }
    this.transporterError.set(null);
    this.lastTransporterApiResponse.set(null);
    this.transporterStatus.set('loading');
    const uid = this.authStore.user()?.id;
    if (!uid) {
      this.transporterStatus.set('error');
      this.transporterError.set('Not signed in.');
      return;
    }
    let existing: EwaybillDbRow | null = null;
    try {
      existing = await this.repo.getById(uid, input.ewaybillId);
    } catch {
      /* ignore */
    }
    const tr = (existing?.transporter_details ?? {}) as Record<string, unknown>;
    const prevCountRaw = existing?.transport_success_count;
    const prevCount =
      typeof prevCountRaw === 'number' && Number.isFinite(prevCountRaw)
        ? prevCountRaw
        : 0;

    try {
      const res = await firstValueFrom(
        this.api.updateTransporter(input.body, input.fromGstin),
      );
      this.lastTransporterApiResponse.set(res.raw);
      await this.repo.insertTransportUpdate(uid, {
        eway_bill_id: input.ewaybillId,
        request_payload: sanitizeUndefinedDeep(
          input.body as unknown as Record<string, unknown>,
        ) as Record<string, unknown>,
        response: sanitizeUndefinedDeep(res.raw) as Record<string, unknown>,
        status: 'success',
        vehicle_no_before: null,
        vehicle_no_after: null,
      });
      const newTrId =
        res.transporterId?.trim().toUpperCase() ||
        String(input.body.transporterId).trim().toUpperCase();
      await this.repo.updateById(uid, input.ewaybillId, {
        transport_last_status: 'success',
        transport_last_at: new Date().toISOString(),
        transport_success_count: prevCount + 1,
        transporter_details: sanitizeUndefinedDeep({
          ...tr,
          transporterId: newTrId,
        }) as Record<string, unknown>,
      });
      await this.loadList();
      this.transporterStatus.set('success');
    } catch (err) {
      const errMsg = messageFromUnknown(err, 'Update transporter failed.');
      this.transporterError.set(errMsg);
      let errBody: Record<string, unknown> = { message: errMsg };
      if (err instanceof EwbGstZenApiError && err.body && typeof err.body === 'object') {
        errBody = err.body as Record<string, unknown>;
      }
      this.lastTransporterApiResponse.set(errBody);
      try {
        await this.repo.insertTransportUpdate(uid, {
          eway_bill_id: input.ewaybillId,
          request_payload: sanitizeUndefinedDeep(
            input.body as unknown as Record<string, unknown>,
          ) as Record<string, unknown>,
          response: sanitizeUndefinedDeep(errBody) as Record<string, unknown>,
          status: 'failed',
          error_message: errMsg,
          vehicle_no_before: null,
          vehicle_no_after: null,
        });
        await this.repo.updateById(uid, input.ewaybillId, {
          transport_last_status: 'failed',
          transport_last_at: new Date().toISOString(),
        });
        await this.loadList();
      } catch {
        /* best-effort audit */
      }
      this.transporterStatus.set('error');
    }
  }

  async submitExtendUpdate(input: EwaybillExtendSubmitInput): Promise<void> {
    await this.submitEwbExtendLike(input, {
      auditOp: 'extend',
      apiCall: (body, fromGstin) => this.api.extend(body, fromGstin),
      status: this.extendStatus,
      error: this.extendError,
      lastResponse: this.lastExtendApiResponse,
      errorFallback: 'Extend e-way bill failed.',
    });
  }

  async submitMultiVehicleMovement(input: EwaybillExtendSubmitInput): Promise<void> {
    await this.submitEwbExtendLike(input, {
      auditOp: 'multi_vehicle',
      apiCall: (body, fromGstin) => this.api.initiateMultiVehicleMovement(body, fromGstin),
      status: this.multiVehicleStatus,
      error: this.multiVehicleError,
      lastResponse: this.lastMultiVehicleApiResponse,
      errorFallback: 'Initiate multi-vehicle movement failed.',
    });
  }

  async submitMvGroupPost(input: EwaybillMvGroupPostSubmitInput): Promise<void> {
    if (this.mvGroupPostStatus() === 'loading') {
      return;
    }
    this.mvGroupPostError.set(null);
    this.lastMvGroupPostApiResponse.set(null);
    this.mvGroupPostStatus.set('loading');
    const uid = this.authStore.user()?.id;
    if (!uid) {
      this.mvGroupPostStatus.set('error');
      this.mvGroupPostError.set('Not signed in.');
      return;
    }
    let existing: EwaybillDbRow | null = null;
    try {
      existing = await this.repo.getById(uid, input.ewaybillId);
    } catch {
      /* ignore */
    }
    const veh = (existing?.vehicle_details ?? {}) as Record<string, unknown>;
    const reqp = (existing?.request_payload ?? {}) as Record<string, unknown>;
    const tr = (existing?.transporter_details ?? {}) as Record<string, unknown>;
    const vehicleBefore = String(
      (typeof veh['vehicleNo'] === 'string' ? veh['vehicleNo'] : '') ||
        (typeof reqp['vehicleNo'] === 'string' ? reqp['vehicleNo'] : '') ||
        '',
    )
      .toUpperCase()
      .replace(/\s+/g, '');
    const vehicleAfter = String(input.body.vehicleNo)
      .toUpperCase()
      .replace(/\s+/g, '');
    const vehicleChanged = !!vehicleAfter && vehicleAfter !== vehicleBefore;
    const prevCountRaw = existing?.transport_success_count;
    const prevCount =
      typeof prevCountRaw === 'number' && Number.isFinite(prevCountRaw)
        ? prevCountRaw
        : 0;

    const auditRequest = sanitizeUndefinedDeep({
      [EWB_TRANSPORT_AUDIT_KIND_KEY]: 'add_multi_vehicles' as const,
      ...input.body,
    }) as Record<string, unknown>;

    try {
      const res = await firstValueFrom(
        this.api.postMvGroup(input.body, input.fromGstin),
      );
      this.lastMvGroupPostApiResponse.set(res.raw as Record<string, unknown>);
      await this.repo.insertTransportUpdate(uid, {
        eway_bill_id: input.ewaybillId,
        request_payload: auditRequest,
        response: sanitizeUndefinedDeep(res.raw) as Record<string, unknown>,
        status: 'success',
        vehicle_no_before: vehicleBefore || null,
        vehicle_no_after: vehicleAfter || null,
      });
      await this.repo.updateById(uid, input.ewaybillId, {
        transport_last_status: 'success',
        transport_last_at: new Date().toISOString(),
        transport_success_count: prevCount + 1,
        transport_last_vehicle_changed: vehicleChanged,
        vehicle_details: sanitizeUndefinedDeep({
          ...veh,
          vehicleNo: input.body.vehicleNo,
        }) as Record<string, unknown>,
        transporter_details: sanitizeUndefinedDeep({
          ...tr,
          transDocNo: input.body.transDocNo,
          transDocDate: input.body.transDocDate,
          lastMvGroupPostGroupNo: input.body.groupNo,
          lastMvGroupPostQuantity: input.body.quantity,
        }) as Record<string, unknown>,
      });
      await this.loadList();
      this.mvGroupPostStatus.set('success');
    } catch (err) {
      const errMsg = messageFromUnknown(err, 'Add multi-vehicles failed.');
      this.mvGroupPostError.set(errMsg);
      let errBody: Record<string, unknown> = { message: errMsg };
      if (err instanceof EwbGstZenApiError && err.body && typeof err.body === 'object') {
        errBody = err.body as Record<string, unknown>;
      }
      this.lastMvGroupPostApiResponse.set(errBody);
      try {
        await this.repo.insertTransportUpdate(uid, {
          eway_bill_id: input.ewaybillId,
          request_payload: auditRequest,
          response: sanitizeUndefinedDeep(errBody) as Record<string, unknown>,
          status: 'failed',
          error_message: errMsg,
          vehicle_no_before: vehicleBefore || null,
          vehicle_no_after: vehicleAfter || null,
        });
        await this.repo.updateById(uid, input.ewaybillId, {
          transport_last_status: 'failed',
          transport_last_at: new Date().toISOString(),
        });
        await this.loadList();
      } catch {
        /* best-effort audit */
      }
      this.mvGroupPostStatus.set('error');
    }
  }

  /**
   * Shared transport audit + DB updates for GSTZen extend-shaped POSTs (extend vs multi-vehicle).
   */
  private async submitEwbExtendLike(
    input: EwaybillExtendSubmitInput,
    ctx: {
      auditOp: EwbTransportAuditOp;
      apiCall: (
        body: EwbExtendRequest,
        fromGstin?: string,
      ) => Observable<EwbExtendSuccess>;
      status: WritableSignal<EwaybillExtendStatus>;
      error: WritableSignal<string | null>;
      lastResponse: WritableSignal<Record<string, unknown> | null>;
      errorFallback: string;
    },
  ): Promise<void> {
    if (ctx.status() === 'loading') {
      return;
    }
    ctx.error.set(null);
    ctx.lastResponse.set(null);
    ctx.status.set('loading');
    const uid = this.authStore.user()?.id;
    if (!uid) {
      ctx.status.set('error');
      ctx.error.set('Not signed in.');
      return;
    }
    let existing: EwaybillDbRow | null = null;
    try {
      existing = await this.repo.getById(uid, input.ewaybillId);
    } catch {
      /* ignore */
    }
    const veh = (existing?.vehicle_details ?? {}) as Record<string, unknown>;
    const reqp = (existing?.request_payload ?? {}) as Record<string, unknown>;
    const tr = (existing?.transporter_details ?? {}) as Record<string, unknown>;
    const vehicleBefore = String(
      (typeof veh['vehicleNo'] === 'string' ? veh['vehicleNo'] : '') ||
        (typeof reqp['vehicleNo'] === 'string' ? reqp['vehicleNo'] : '') ||
        '',
    )
      .toUpperCase()
      .replace(/\s+/g, '');
    const vehicleAfter = String(input.body.vehicleNo)
      .toUpperCase()
      .replace(/\s+/g, '');
    const vehicleChanged = !!vehicleAfter && vehicleAfter !== vehicleBefore;
    const prevCountRaw = existing?.transport_success_count;
    const prevCount =
      typeof prevCountRaw === 'number' && Number.isFinite(prevCountRaw)
        ? prevCountRaw
        : 0;

    const auditRequest = sanitizeUndefinedDeep({
      [EWB_TRANSPORT_AUDIT_KIND_KEY]: ctx.auditOp,
      ...input.body,
    }) as Record<string, unknown>;

    try {
      const res = await firstValueFrom(ctx.apiCall(input.body, input.fromGstin));
      ctx.lastResponse.set(res.raw as Record<string, unknown>);
      await this.repo.insertTransportUpdate(uid, {
        eway_bill_id: input.ewaybillId,
        request_payload: auditRequest,
        response: sanitizeUndefinedDeep(res.raw) as Record<string, unknown>,
        status: 'success',
        vehicle_no_before: vehicleBefore || null,
        vehicle_no_after: vehicleAfter || null,
      });
      await this.repo.updateById(uid, input.ewaybillId, {
        transport_last_status: 'success',
        transport_last_at: new Date().toISOString(),
        transport_success_count: prevCount + 1,
        transport_last_vehicle_changed: vehicleChanged,
        vehicle_details: sanitizeUndefinedDeep({
          ...veh,
          vehicleNo: input.body.vehicleNo,
        }) as Record<string, unknown>,
        transporter_details: sanitizeUndefinedDeep({
          ...tr,
          transMode: input.body.transMode,
          transDocNo: input.body.transDocNo,
          transDocDate: input.body.transDocDate,
          lastExtendValidUpto: res.validUpto ?? null,
          lastExtendExtnRsnCode: input.body.extnRsnCode,
          lastConsignmentStatus: input.body.consignmentStatus,
        }) as Record<string, unknown>,
      });
      await this.loadList();
      ctx.status.set('success');
    } catch (err) {
      const errMsg = messageFromUnknown(err, ctx.errorFallback);
      ctx.error.set(errMsg);
      let errBody: Record<string, unknown> = { message: errMsg };
      if (err instanceof EwbGstZenApiError && err.body && typeof err.body === 'object') {
        errBody = err.body as Record<string, unknown>;
      }
      ctx.lastResponse.set(errBody);
      try {
        await this.repo.insertTransportUpdate(uid, {
          eway_bill_id: input.ewaybillId,
          request_payload: auditRequest,
          response: sanitizeUndefinedDeep(errBody) as Record<string, unknown>,
          status: 'failed',
          error_message: errMsg,
          vehicle_no_before: vehicleBefore || null,
          vehicle_no_after: vehicleAfter || null,
        });
        await this.repo.updateById(uid, input.ewaybillId, {
          transport_last_status: 'failed',
          transport_last_at: new Date().toISOString(),
        });
        await this.loadList();
      } catch {
        /* best-effort audit */
      }
      ctx.status.set('error');
    }
  }
}
