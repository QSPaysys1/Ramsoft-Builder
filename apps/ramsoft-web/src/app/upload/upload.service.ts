import { HttpClient, HttpEventType } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { SUPABASE_CLIENT } from '@ramsoft-builder/shared/data-access/supabase';
import { Observable, from, map, switchMap } from 'rxjs';

const UPLOAD_URL = '/api/upload';

export type UploadResultType = 'cloudflare_images' | 'r2';

/** A persisted upload row as stored in the Supabase `uploads` table. */
export interface UploadRow {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number | null;
  storage_type: UploadResultType;
  cloudflare_image_id: string | null;
  cloudflare_image_url: string | null;
  r2_object_key: string | null;
  r2_public_url: string | null;
  created_at: string;
}

export interface UploadSuccess {
  success: true;
  id: string;
  url: string;
  type: UploadResultType;
}

export interface UploadApiError {
  success: false;
  message: string;
}

export type UploadResponse = UploadSuccess | UploadApiError;

/** Emitted while an upload is in flight. */
export type UploadEvent =
  | { kind: 'progress'; progress: number }
  | { kind: 'done'; response: UploadSuccess };

/**
 * Browser-side client for `POST /api/upload`. Attaches the current Supabase
 * access token so the server can attribute the upload to the signed-in user.
 * The actual storage credentials never leave the server.
 */
@Injectable({ providedIn: 'root' })
export class UploadService {
  private readonly http = inject(HttpClient);
  private readonly supabase = inject(SUPABASE_CLIENT, { optional: true });

  upload(file: File): Observable<UploadEvent> {
    return from(this.getAccessToken()).pipe(
      switchMap((token) => this.postFile(file, token)),
    );
  }

  listUploads(): Observable<UploadRow[]> {
    return from(this.getAccessToken()).pipe(
      switchMap((token) => {
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        return this.http.get<{ success: boolean; uploads?: UploadRow[] }>(
          UPLOAD_URL,
          { headers },
        );
      }),
      map((res) => res.uploads ?? []),
    );
  }

  private async getAccessToken(): Promise<string | null> {
    if (!this.supabase) {
      return null;
    }
    const { data } = await this.supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  private postFile(file: File, token: string | null): Observable<UploadEvent> {
    const formData = new FormData();
    formData.append('file', file);

    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

    return new Observable<UploadEvent>((subscriber) => {
      const sub = this.http
        .post<UploadResponse>(UPLOAD_URL, formData, {
          headers,
          reportProgress: true,
          observe: 'events',
        })
        .subscribe({
          next: (event) => {
            if (event.type === HttpEventType.UploadProgress) {
              const progress = event.total
                ? Math.round((event.loaded / event.total) * 100)
                : 0;
              subscriber.next({ kind: 'progress', progress });
              return;
            }
            if (event.type === HttpEventType.Response) {
              const body = event.body;
              if (body && body.success) {
                subscriber.next({ kind: 'done', response: body });
                subscriber.complete();
              } else {
                subscriber.error(
                  new Error(body?.message ?? 'Upload failed. Please try again.'),
                );
              }
            }
          },
          error: (err: unknown) => subscriber.error(this.toError(err)),
        });

      return () => sub.unsubscribe();
    });
  }

  private toError(err: unknown): Error {
    if (err instanceof Error) {
      return err;
    }
    const message =
      typeof err === 'object' &&
      err !== null &&
      'error' in err &&
      typeof (err as { error?: { message?: unknown } }).error?.message ===
        'string'
        ? (err as { error: { message: string } }).error.message
        : 'Upload failed. Please try again.';
    return new Error(message);
  }
}
