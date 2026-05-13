import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import type {
  EwaybillDbRow,
  EwaybillInsert,
  EwaybillListView,
} from '@ramsoft-builder/ewaybills/models/ewb';
import { SUPABASE_CLIENT } from '@ramsoft-builder/shared/data-access/supabase';
import { sanitizeUndefinedDeep } from '@ramsoft-builder/ewaybills/utils/core';
import { EWAY_BILLS_TABLE } from './ewb.constants';

function rowToListView(row: Record<string, unknown>): EwaybillListView {
    const inv = (row['invoice_details'] as Record<string, unknown>) ?? {};
    const req = (row['request_payload'] as Record<string, unknown>) ?? {};
    const fromInv = typeof inv['fromGstin'] === 'string' ? inv['fromGstin'] : null;
    const fromReq = typeof req['fromGstin'] === 'string' ? req['fromGstin'] : null;
    return {
      id: String(row['id']),
      ewbNumber: row['ewb_number'] != null ? String(row['ewb_number']) : null,
      status: row['status'] as EwaybillListView['status'],
      docNo: typeof inv['docNo'] === 'string' ? inv['docNo'] : null,
      docDate: typeof inv['docDate'] === 'string' ? inv['docDate'] : null,
      createdAt: String(row['created_at']),
      fromGstin: fromInv ?? fromReq,
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
        'id,ewb_number,status,invoice_details,request_payload,created_at',
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
    >,
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
