import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

/**
 * Thin JSON POST wrapper for GSTZen APIs.
 * Bearer tokens are attached by `gstr1BearerInterceptor`; do not set Authorization here.
 */
@Injectable({ providedIn: 'root' })
export class GstzenHttpClient {
  private readonly http = inject(HttpClient);

  /** POST JSON body; trims string fields in callers before invoking. */
  postJson<T = unknown>(url: string, body: unknown): Observable<T> {
    return this.http.post<T>(url, body, {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
