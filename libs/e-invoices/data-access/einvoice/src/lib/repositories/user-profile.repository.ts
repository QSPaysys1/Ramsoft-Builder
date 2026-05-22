import { inject, Injectable } from '@angular/core';
import { SUPABASE_CLIENT } from '@ramsoft-builder/shared/data-access/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { Observable } from 'rxjs';

/** Optional wide-table row (`public.legacy_user_flat`) for GSTR / GST portal fields. */
export type LegacyUserFlatRow = {
  readonly gstin: string | null;
  readonly user_name: string | null;
  readonly extra: Record<string, unknown> | null;
};

@Injectable({ providedIn: 'root' })
export class UserProfileRepository {
  private readonly client = inject(SUPABASE_CLIENT);

  /** Emits profile `data` jsonb (flat legacy fields) or `undefined`. */
  watchProfileData(userId: string): Observable<Record<string, unknown> | undefined> {
    const c = this.client;
    if (!c || !userId) {
      return new Observable((sub) => {
        sub.next(undefined);
        sub.complete();
      });
    }
    return new Observable((subscriber) => {
      let channel: RealtimeChannel | null = null;

      const emitFromRow = (data: unknown) => {
        if (data != null && typeof data === 'object' && 'data' in data) {
          const inner = (data as { data?: unknown }).data;
          subscriber.next(inner as Record<string, unknown> | undefined);
        } else {
          subscriber.next(undefined);
        }
      };

      const load = async () => {
        const { data, error } = await c
          .from('profiles')
          .select('data')
          .eq('id', userId)
          .maybeSingle();
        if (error || !data) {
          subscriber.next(undefined);
        } else {
          emitFromRow(data);
        }
      };

      void load().then(() => {
        channel = c
          .channel(`profiles-${userId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'profiles',
              filter: `id=eq.${userId}`,
            },
            (payload) => {
              if (payload.eventType === 'DELETE') {
                subscriber.next(undefined);
              } else {
                emitFromRow(payload.new);
              }
            },
          )
          .subscribe();
      });

      return () => {
        if (channel) {
          void c.removeChannel(channel);
        }
      };
    });
  }

  /** Emits `legacy_user_flat` columns used for GST portal username / GSTIN fallbacks. */
  watchLegacyUserFlat(userId: string): Observable<LegacyUserFlatRow | undefined> {
    const c = this.client;
    if (!c || !userId) {
      return new Observable((sub) => {
        sub.next(undefined);
        sub.complete();
      });
    }
    return new Observable((subscriber) => {
      let channel: RealtimeChannel | null = null;

      const emitFromRow = (row: unknown) => {
        if (row == null || typeof row !== 'object') {
          subscriber.next(undefined);
          return;
        }
        const r = row as Record<string, unknown>;
        const extraRaw = r['extra'];
        subscriber.next({
          gstin: typeof r['gstin'] === 'string' ? r['gstin'] : null,
          user_name: typeof r['user_name'] === 'string' ? r['user_name'] : null,
          extra:
            extraRaw != null && typeof extraRaw === 'object'
              ? (extraRaw as Record<string, unknown>)
              : null,
        });
      };

      const load = async () => {
        const { data, error } = await c
          .from('legacy_user_flat')
          .select('gstin, user_name, extra')
          .eq('id', userId)
          .maybeSingle();
        if (error || !data) {
          subscriber.next(undefined);
        } else {
          emitFromRow(data);
        }
      };

      void load().then(() => {
        channel = c
          .channel(`legacy-user-flat-${userId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'legacy_user_flat',
              filter: `id=eq.${userId}`,
            },
            (payload) => {
              if (payload.eventType === 'DELETE') {
                subscriber.next(undefined);
              } else {
                emitFromRow(payload.new);
              }
            },
          )
          .subscribe();
      });

      return () => {
        if (channel) {
          void c.removeChannel(channel);
        }
      };
    });
  }
}
