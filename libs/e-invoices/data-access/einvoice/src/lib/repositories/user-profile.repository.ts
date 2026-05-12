import { inject, Injectable } from '@angular/core';
import { SUPABASE_CLIENT } from '@ramsoft-builder/shared/data-access/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { Observable } from 'rxjs';

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
}
