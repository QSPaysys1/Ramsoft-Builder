import { inject, Injectable } from '@angular/core';
import { Observable, of, switchMap, throwError, map } from 'rxjs';
import {
  deriveGstnCheckSessionUiOutcome,
  isGstnCheckSessionSuccessResponse,
  type GstnCheckSessionSuccessResponse,
} from './gstn-check-session.models';
import { Gstr1AuthError } from './gstr1-auth.errors';
import { Gstr1GstnOtpApiService } from './gstr1-gstn-otp-api.service';

/** Outcome of {@link Gstr1GstnSessionEnsureService.ensureGstnPortalSession}. */
export type EnsureGstnPortalSessionResult =
  | { readonly kind: 'already_active'; readonly checkResponse: GstnCheckSessionSuccessResponse }
  | {
      readonly kind: 'refreshed';
      readonly checkResponse: GstnCheckSessionSuccessResponse;
      readonly refreshResponse: unknown;
    }
  | { readonly kind: 'invalid_gstin'; readonly checkResponse: GstnCheckSessionSuccessResponse }
  | {
      readonly kind: 'ambiguous_no_refresh';
      readonly checkResponse: GstnCheckSessionSuccessResponse;
    };

/**
 * Runs `gstn-check-session` then `gstn-refresh-session` only when the portal session is
 * clearly inactive/expired ({@link deriveGstnCheckSessionUiOutcome} → `session_expired`).
 */
@Injectable({ providedIn: 'root' })
export class Gstr1GstnSessionEnsureService {
  private readonly gstnApi = inject(Gstr1GstnOtpApiService);

  ensureGstnPortalSession(gstin: string): Observable<EnsureGstnPortalSessionResult> {
    const g = gstin.trim().toUpperCase();
    return this.gstnApi.checkGstinSession({ gstin: g }).pipe(
      switchMap((rawUnknown): Observable<EnsureGstnPortalSessionResult> => {
        if (!isGstnCheckSessionSuccessResponse(rawUnknown)) {
          return throwError(
            () =>
              new Gstr1AuthError(
                'Unexpected response from gstn-check-session.',
                undefined,
                rawUnknown,
              ),
          );
        }
        const checkResponse = rawUnknown;
        const outcome = deriveGstnCheckSessionUiOutcome(checkResponse);
        if (outcome === 'active_session') {
          return of({ kind: 'already_active', checkResponse });
        }
        if (outcome === 'invalid_gstin') {
          return of({ kind: 'invalid_gstin', checkResponse });
        }
        if (outcome === 'session_expired') {
          return this.gstnApi.refreshGstinSession({ gstin: g }).pipe(
            map((refreshResponse) => ({
              kind: 'refreshed' as const,
              checkResponse,
              refreshResponse,
            })),
          );
        }
        return of({ kind: 'ambiguous_no_refresh', checkResponse });
      }),
    );
  }
}
