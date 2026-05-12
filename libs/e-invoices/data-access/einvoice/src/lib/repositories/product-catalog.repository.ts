import { inject, Injectable } from '@angular/core';
import { SUPABASE_CLIENT } from '@ramsoft-builder/shared/data-access/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { Observable } from 'rxjs';

interface ProductRow {
  id: string;
  user_id: string;
  created_at: string;
  data: Record<string, unknown>;
}

function rowToLegacyProductDoc(row: ProductRow): Record<string, unknown> {
  return {
    ...row.data,
    id: row.id,
    createdBy: row.user_id,
    createdAt: row.created_at,
  };
}

@Injectable({ providedIn: 'root' })
export class ProductCatalogRepository {
  private readonly client = inject(SUPABASE_CLIENT);

  /** Legacy-shaped product rows for the variety dropdown. */
  watchProductsForUser(userId: string): Observable<Record<string, unknown>[]> {
    const c = this.client;
    if (!c || !userId) {
      return new Observable((sub) => {
        sub.next([]);
        sub.complete();
      });
    }
    return new Observable((subscriber) => {
      let channel: RealtimeChannel | null = null;

      const pushList = (list: Record<string, unknown>[]) => {
        subscriber.next(list);
      };

      const load = async () => {
        const { data, error } = await c
          .from('products')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: true });
        if (error) {
          pushList([]);
        } else {
          pushList((data as ProductRow[]).map(rowToLegacyProductDoc));
        }
      };

      void load().then(() => {
        channel = c
          .channel(`products-${userId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'products',
              filter: `user_id=eq.${userId}`,
            },
            () => {
              void load();
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
