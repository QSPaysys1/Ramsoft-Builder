import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  GstnEstablishSessionRequestBody,
  GstnGenerateOtpRequestBody,
} from './gstn-generate-otp.models';
import type {
  GstnCheckSessionRequestBody,
  GstnCheckSessionSuccessResponse,
} from './gstn-check-session.models';
import type { GstnRefreshSessionRequestBody } from './gstn-refresh-session.models';
import { GSTR1_GSTZEN_AUTH_CONFIG } from './gstr1-gstzen-auth.config';

/**
 * GSTZen GSTN APIs (Generate OTP, Establish Session, Check Session, Refresh Session). Bearer token applied by interceptors.
 */
@Injectable({ providedIn: 'root' })
export class Gstr1GstnOtpApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(GSTR1_GSTZEN_AUTH_CONFIG);

  generateOtp(body: GstnGenerateOtpRequestBody): Observable<unknown> {
    return this.http.post<unknown>(
      this.config.gstnGenerateOtpUrl,
      { gstin: body.gstin.trim().toUpperCase(), username: body.username.trim() },
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  establishSession(body: GstnEstablishSessionRequestBody): Observable<unknown> {
    return this.http.post<unknown>(
      this.config.gstnEstablishSessionUrl,
      {
        gstin: body.gstin.trim().toUpperCase(),
        otp: body.otp.trim(),
      },
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  /** `POST gstn-check-session/` — Bearer token attached by `gstr1BearerInterceptor`. */
  checkGstinSession(
    body: GstnCheckSessionRequestBody,
  ): Observable<GstnCheckSessionSuccessResponse> {
    return this.http.post<GstnCheckSessionSuccessResponse>(
      this.config.gstnCheckSessionUrl,
      { gstin: body.gstin.trim().toUpperCase() },
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  /** `POST gstn-refresh-session/` — Bearer token attached by `gstr1BearerInterceptor`. */
  refreshGstinSession(body: GstnRefreshSessionRequestBody): Observable<unknown> {
    return this.http.post<unknown>(
      this.config.gstnRefreshSessionUrl,
      { gstin: body.gstin.trim().toUpperCase() },
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}
