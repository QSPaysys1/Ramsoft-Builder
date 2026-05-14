import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import {
  formatGstZenJwtDetail,
  isGstZenJwtLoginError,
  isGstZenJwtTokenPair,
  type GstZenJwtTokenPair,
} from '@ramsoft-builder/gstr1/models/jwt';
import { Gstr1AuthError } from './gstr1-auth.errors';
import { GSTR1_GSTZEN_AUTH_CONFIG } from './gstr1-gstzen-auth.config';

/**
 * GSTZen portal login (`POST` token URL). Persisted JWTs and clipboard helpers live in
 * `Gstr1AuthStore`; tokens are surfaced on the workspace session page.
 */
@Injectable({ providedIn: 'root' })
export class Gstr1GstzenAuthService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(GSTR1_GSTZEN_AUTH_CONFIG);

  login(username: string, password: string): Observable<GstZenJwtTokenPair> {
    const body = new URLSearchParams({
      username: username.trim(),
      password,
    });
    return this.http
      .post<unknown>(this.config.loginTokenUrl, body.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      .pipe(
        map((raw) => {
          if (isGstZenJwtTokenPair(raw)) {
            return raw;
          }
          if (isGstZenJwtLoginError(raw)) {
            throw new Gstr1AuthError(formatGstZenJwtDetail(raw.detail), 400, raw);
          }
          throw new Gstr1AuthError('Unexpected response from GSTZen login.', undefined, raw);
        }),
        catchError((err: unknown) => {
          if (err instanceof Gstr1AuthError) {
            return throwError(() => err);
          }
          if (err instanceof HttpErrorResponse) {
            const body = err.error as Record<string, unknown> | string | null;
            const detail =
              body && typeof body === 'object' && 'detail' in body
                ? formatGstZenJwtDetail((body as { detail?: unknown }).detail)
                : err.message;
            return throwError(
              () => new Gstr1AuthError(detail || 'Login request failed.', err.status, err.error),
            );
          }
          return throwError(() => new Gstr1AuthError('Login request failed.', undefined, err));
        }),
      );
  }
}
