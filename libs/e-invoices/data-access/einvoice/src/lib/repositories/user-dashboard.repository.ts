import { inject, Injectable } from '@angular/core';
import { SUPABASE_CLIENT } from '@ramsoft-builder/shared/data-access/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { Observable } from 'rxjs';

/** Dashboard fields used by the home page (`dashboardCount`). */
export type UserDashboardRecord = Record<string, unknown>;

function rowToDashboardRecord(row: Record<string, unknown> | null): UserDashboardRecord {
  if (!row) {
    return {};
  }
  const out: UserDashboardRecord = {};
  for (const k of [
    'invoices',
    'cinvoices',
    'ewaybills',
    'creditnotes',
    'debitnotes',
  ] as const) {
    if (k in row) {
      out[k] = row[k];
    }
  }
  return out;
}

@Injectable({ providedIn: 'root' })
export class UserDashboardRepository {
  private readonly client = inject(SUPABASE_CLIENT);

  watchDashboard(userId: string, fyKey: string): Observable<UserDashboardRecord> {
    const c = this.client;
    if (!c || !userId || !fyKey) {
      return new Observable((sub) => {
        sub.next({});
        sub.complete();
      });
    }
    return new Observable((subscriber) => {
      let channel: RealtimeChannel | null = null;
      let cancelled = false;

      const load = async (): Promise<void> => {
        const { data, error } = await c
          .from('user_dashboard_fy')
          .select('*')
          .eq('user_id', userId)
          .eq('fy_key', fyKey)
          .maybeSingle();
        if (cancelled) {
          return;
        }
        if (error || !data) {
          subscriber.next({});
        } else {
          subscriber.next(rowToDashboardRecord(data as Record<string, unknown>));
        }
      };

      const channelName = `dash-${userId}-${fyKey}`;

      void (async () => {
        await load();
        if (cancelled) {
          return;
        }
        // Register postgres_changes before subscribe() (Supabase realtime requirement).
        channel = c.channel(channelName);
        channel
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'user_dashboard_fy',
              filter: `user_id=eq.${userId}`,
            },
            (payload) => {
              if (payload.eventType === 'DELETE') {
                void load();
                return;
              }
              const row = payload.new as { fy_key?: string } | undefined;
              if (row?.fy_key === fyKey) {
                void load();
              }
            },
          )
          .subscribe();
      })();

      return () => {
        cancelled = true;
        if (channel) {
          void c.removeChannel(channel);
          channel = null;
        }
      };
    });
  }

  async decrementInvoiceCount(userId: string, fyKey: string): Promise<void> {
    const c = this.client;
    if (!c || !userId || !fyKey) {
      return;
    }
    const { data: row, error: readErr } = await c
      .from('user_dashboard_fy')
      .select('invoices')
      .eq('user_id', userId)
      .eq('fy_key', fyKey)
      .maybeSingle();
    if (readErr) {
      return;
    }
    const current =
      row && typeof row === 'object' && 'invoices' in row
        ? Number((row as { invoices?: unknown }).invoices)
        : NaN;
    const next = Number.isFinite(current) ? Math.max(0, current - 1) : 0;
    const { error: writeErr } = await c
      .from('user_dashboard_fy')
      .update({ invoices: next, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('fy_key', fyKey);
    if (writeErr) {
      /* row may not exist */
    }
  }
}
