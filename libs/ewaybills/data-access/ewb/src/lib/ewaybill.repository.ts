import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import type {
  EwaybillDbRow,
  EwaybillInsert,
  EwaybillListView,
  EwaybillTransportLastStatus,
  EwaybillTransportUpdateDbRow,
  EwaybillTransportUpdateInsert,
} from '@ramsoft-builder/ewaybills/models/ewb';
import { SUPABASE_CLIENT } from '@ramsoft-builder/shared/data-access/supabase';
import { sanitizeUndefinedDeep } from '@ramsoft-builder/ewaybills/utils/core';
import { EWAY_BILLS_TABLE, EWAY_BILL_TRANSPORT_UPDATES_TABLE } from './ewb.constants';

function pickStr(r: Record<string, unknown>, k: string): string | null {
  const v = r[k];
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function transporterLabel(
  tr: Record<string, unknown>,
  req: Record<string, unknown>,
): string | null {
  return (
    pickStr(tr, 'transporterName') ||
    pickStr(req, 'transporterName') ||
    pickStr(tr, 'transporterId') ||
    pickStr(req, 'transporterId') ||
    null
  );
}

function vehicleNoFrom(
  veh: Record<string, unknown>,
  req: Record<string, unknown>,
): string | null {
  return pickStr(veh, 'vehicleNo') || pickStr(req, 'vehicleNo') || null;
}

function rowToListView(row: Record<string, unknown>): EwaybillListView {
  const inv = (row['invoice_details'] as Record<string, unknown>) ?? {};
  const req = (row['request_payload'] as Record<string, unknown>) ?? {};
  const tr = (row['transporter_details'] as Record<string, unknown>) ?? {};
  const veh = (row['vehicle_details'] as Record<string, unknown>) ?? {};
  const fromInv = typeof inv['fromGstin'] === 'string' ? inv['fromGstin'] : null;
  const fromReq = typeof req['fromGstin'] === 'string' ? req['fromGstin'] : null;
  const tls = row['transport_last_status'];
  const transportLastStatus: EwaybillTransportLastStatus | null =
    tls === 'success' || tls === 'failed' ? tls : null;
  const tsc = row['transport_success_count'];
  const transportSuccessCount =
    typeof tsc === 'number' && Number.isFinite(tsc) ? tsc : Number(tsc) || 0;
  const tvc = row['transport_last_vehicle_changed'];
  const transportLastVehicleChanged = tvc === true || tvc === 'true';
  return {
    id: String(row['id']),
    ewbNumber: row['ewb_number'] != null ? String(row['ewb_number']) : null,
    status: row['status'] as EwaybillListView['status'],
    docNo: typeof inv['docNo'] === 'string' ? inv['docNo'] : null,
    docDate: typeof inv['docDate'] === 'string' ? inv['docDate'] : null,
    createdAt: String(row['created_at']),
    fromGstin: fromInv ?? fromReq,
    transporterLabel: transporterLabel(tr, req),
    vehicleNo: vehicleNoFrom(veh, req),
    transportLastStatus,
    transportLastAt:
      row['transport_last_at'] != null ? String(row['transport_last_at']) : null,
    transportSuccessCount,
    transportLastVehicleChanged,
  };
}

@Injectable({ providedIn: 'root' })
export class EwaybillRepository {
  private readonly client = inject(SUPABASE_CLIENT);
  private readonly platformId = inject(PLATFORM_ID);

  async insertGenerated(
    userId: string,
    row: Omit<EwaybillInsert, 'user_id'>,
  ): Promise<{ id: string }> {
    const c = this.requireBrowserClient();
    const payload = sanitizeUndefinedDeep({
      user_id: userId,
      ...row,
      updated_at: new Date().toISOString(),
    }) as Record<string, unknown>;
    const { data, error } = await c
      .from(EWAY_BILLS_TABLE)
      .insert(payload)
      .select('id')
      .single();
    if (error) {
      throw error;
    }
    return { id: String((data as { id: string }).id) };
  }

  async listForUser(userId: string): Promise<EwaybillListView[]> {
    if (!isPlatformBrowser(this.platformId)) {
      return [];
    }
    const c = this.client;
    if (!c) {
      return [];
    }
    const { data, error } = await c
      .from(EWAY_BILLS_TABLE)
      .select(
        'id,ewb_number,status,invoice_details,request_payload,transporter_details,vehicle_details,created_at,transport_last_status,transport_last_at,transport_success_count,transport_last_vehicle_changed',
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) {
      throw error;
    }
    return (data as Record<string, unknown>[]).map(rowToListView);
  }

  async getById(userId: string, id: string): Promise<EwaybillDbRow | null> {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    const c = this.client;
    if (!c) {
      return null;
    }
    const { data, error } = await c
      .from(EWAY_BILLS_TABLE)
      .select('*')
      .eq('user_id', userId)
      .eq('id', id)
      .maybeSingle();
    if (error) {
      throw error;
    }
    if (!data) {
      return null;
    }
    return data as unknown as EwaybillDbRow;
  }

  async updateById(
    userId: string,
    id: string,
    patch: Partial<
      Pick<
        EwaybillInsert,
        | 'ewb_number'
        | 'invoice_details'
        | 'transporter_details'
        | 'vehicle_details'
        | 'generated_response'
        | 'cancel_response'
        | 'cancel_reason'
        | 'cancelled_at'
        | 'status'
      >
    > &
      Partial<{
        transport_last_status: EwaybillTransportLastStatus | null;
        transport_last_at: string | null;
        transport_success_count: number;
        transport_last_vehicle_changed: boolean;
      }>,
  ): Promise<void> {
    const c = this.requireBrowserClient();
    const body = sanitizeUndefinedDeep({
      ...patch,
      updated_at: new Date().toISOString(),
    }) as Record<string, unknown>;
    const { error } = await c
      .from(EWAY_BILLS_TABLE)
      .update(body)
      .eq('user_id', userId)
      .eq('id', id);
    if (error) {
      throw error;
    }
  }

  async insertTransportUpdate(
    userId: string,
    row: Omit<EwaybillTransportUpdateInsert, 'user_id'>,
  ): Promise<{ id: string }> {
    const c = this.requireBrowserClient();
    const payload = sanitizeUndefinedDeep({
      user_id: userId,
      ...row,
    }) as Record<string, unknown>;
    const { data, error } = await c
      .from(EWAY_BILL_TRANSPORT_UPDATES_TABLE)
      .insert(payload)
      .select('id')
      .single();
    if (error) {
      throw error;
    }
    return { id: String((data as { id: string }).id) };
  }

  async listTransportUpdatesForEwaybill(
    userId: string,
    ewayBillId: string,
  ): Promise<EwaybillTransportUpdateDbRow[]> {
    if (!isPlatformBrowser(this.platformId)) {
      return [];
    }
    const c = this.client;
    if (!c) {
      return [];
    }
    const { data, error } = await c
      .from(EWAY_BILL_TRANSPORT_UPDATES_TABLE)
      .select('*')
      .eq('user_id', userId)
      .eq('eway_bill_id', ewayBillId)
      .order('created_at', { ascending: false });
    if (error) {
      throw error;
    }
    return (data ?? []) as unknown as EwaybillTransportUpdateDbRow[];
  }

  /**
   * Best-effort: bumps `user_dashboard_fy.ewaybills` when FY row exists (same keys as home dashboard).
   */
  async bumpDashboardEwaybillCount(userId: string, fyKey: string): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const c = this.client;
    if (!c) {
      return;
    }
    const { data: row, error: readErr } = await c
      .from('user_dashboard_fy')
      .select('ewaybills')
      .eq('user_id', userId)
      .eq('fy_key', fyKey)
      .maybeSingle();
    if (readErr) {
      return;
    }
    const current =
      row && typeof row === 'object' && 'ewaybills' in row
        ? Number((row as { ewaybills?: unknown }).ewaybills)
        : NaN;
    const next = Number.isFinite(current) ? current + 1 : 1;
    const { error: writeErr } = await c
      .from('user_dashboard_fy')
      .update({ ewaybills: next, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('fy_key', fyKey);
    void writeErr;
  }

  private requireBrowserClient() {
    if (!isPlatformBrowser(this.platformId)) {
      throw new Error('E-way bill persistence is only available in the browser.');
    }
    const c = this.client;
    if (!c) {
      throw new Error('Supabase client is not available.');
    }
    return c;
  }
}
