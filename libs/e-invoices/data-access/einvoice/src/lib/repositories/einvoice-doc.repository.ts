import { inject, Injectable } from '@angular/core';
import { SUPABASE_CLIENT } from '@ramsoft-builder/shared/data-access/supabase';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { Observable } from 'rxjs';
import { einvoiceDocSortKey } from '../einvoice-doc-sort-key';

export type EinvoiceLegacyDoc = Record<string, unknown> & { id: string };

interface EinvoiceRow {
  id: string;
  user_id: string;
  base_object: unknown;
  gstzen_response: unknown;
  created_at: string;
  sort_date_2: number;
}

function rowToLegacyDoc(row: EinvoiceRow): EinvoiceLegacyDoc {
  return {
    id: row.id,
    uid: row.user_id,
    baseObject: row.base_object,
    gstzenResponse: row.gstzen_response,
    createdAt: row.created_at,
    sortDate2: row.sort_date_2,
  };
}

@Injectable({ providedIn: 'root' })
export class EinvoiceDocRepository {
  private readonly client = inject(SUPABASE_CLIENT);

  watchEinvoicesForUser(userId: string): Observable<EinvoiceLegacyDoc[]> {
    const c = this.client;
    if (!c || !userId) {
      return new Observable((sub) => {
        sub.next([]);
        sub.complete();
      });
    }
    return new Observable((subscriber) => {
      let rows: EinvoiceLegacyDoc[] = [];
      let channel: RealtimeChannel | null = null;

      const push = () => {
        subscriber.next([...rows]);
      };

      const load = async () => {
        const { data, error } = await c
          .from('einvoices')
          .select('*')
          .eq('user_id', userId)
          .order('sort_date_2', { ascending: false })
          .limit(500);
        if (error) {
          rows = [];
        } else {
          rows = (data as EinvoiceRow[]).map(rowToLegacyDoc);
        }
        push();
      };

      void load().then(() => {
        channel = c
          .channel(`einvoices-${userId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'einvoices',
              filter: `user_id=eq.${userId}`,
            },
            (payload) => {
              if (payload.eventType === 'DELETE') {
                const id = (payload.old as { id?: string })?.id;
                if (id) {
                  rows = rows.filter((r) => r.id !== id);
                }
              } else {
                const raw = payload.new as EinvoiceRow;
                if (!raw?.id) {
                  return;
                }
                const doc = rowToLegacyDoc(raw);
                rows = rows.filter((r) => r.id !== doc.id);
                rows.push(doc);
                rows.sort(
                  (a, b) => einvoiceDocSortKey(b) - einvoiceDocSortKey(a),
                );
                rows = rows.slice(0, 500);
              }
              push();
            },
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              push();
            }
          });
      });

      return () => {
        if (channel) {
          void c.removeChannel(channel);
        }
      };
    });
  }

  async deleteEinvoice(id: string): Promise<void> {
    const c = this.requireClient();
    const { error } = await c.from('einvoices').delete().eq('id', id);
    if (error) {
      throw error;
    }
  }

  /**
   * After GSTZen cancel succeeds: archive row into `cinvoices`, remove from `einvoices`,
   * and adjust `user_dashboard_fy` counts (requires migration `archive_and_remove_einvoice`).
   */
  async finalizeCancellation(params: {
    einvoiceId: string;
    cancelResponse: unknown;
    cancelReason: string;
    fyKey: string | null;
  }): Promise<void> {
    const c = this.requireClient();
    const { error } = await c.rpc('archive_and_remove_einvoice', {
      p_id: params.einvoiceId,
      p_cancel_json: params.cancelResponse as object,
      p_cancel_reason: params.cancelReason,
      p_fy_key: params.fyKey ?? '',
    });
    if (error) {
      throw error;
    }
  }

  /** Single row for manage/view; RLS should scope to the signed-in user. */
  async getEinvoiceById(id: string): Promise<EinvoiceLegacyDoc | null> {
    const c = this.client;
    const trimmed = id?.trim();
    if (!c || !trimmed) {
      return null;
    }
    const { data, error } = await c
      .from('einvoices')
      .select('*')
      .eq('id', trimmed)
      .maybeSingle();
    if (error || !data) {
      return null;
    }
    return rowToLegacyDoc(data as EinvoiceRow);
  }

  private requireClient(): SupabaseClient {
    const c = this.client;
    if (!c) {
      throw new Error('Supabase client is not available.');
    }
    return c;
  }
}
