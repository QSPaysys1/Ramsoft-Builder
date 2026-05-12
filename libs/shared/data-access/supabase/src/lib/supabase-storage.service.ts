import { Injectable, inject } from '@angular/core';
import { SUPABASE_CLIENT } from './supabase.client';

/**
 * Thin wrapper for Supabase Storage (`app-uploads` bucket). Folder layout:
 * `{userId}/{...path}` — must match storage RLS policies in the SQL migration.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseStorageService {
  private readonly client = inject(SUPABASE_CLIENT);

  async upload(
    bucket: string,
    path: string,
    file: Blob | ArrayBuffer | ArrayBufferView,
    options?: { contentType?: string; upsert?: boolean },
  ): Promise<{ path: string; error: Error | null }> {
    const c = this.client;
    if (!c) {
      return { path, error: new Error('Storage is only available in the browser.') };
    }
    const { error } = await c.storage.from(bucket).upload(path, file, {
      contentType: options?.contentType,
      upsert: options?.upsert ?? false,
    });
    return { path, error: error ?? null };
  }

  getPublicUrl(bucket: string, path: string): string {
    const c = this.client;
    if (!c) {
      return '';
    }
    const { data } = c.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }
}
