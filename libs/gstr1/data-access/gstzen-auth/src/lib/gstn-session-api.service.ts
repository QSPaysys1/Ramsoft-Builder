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
import { GstzenHttpClient } from './gstzen-http.client';

/** GST portal OTP and session lifecycle (`gstn-*` endpoints). */
@Injectable({ providedIn: 'root' })
export class GstnSessionApiService {
  private readonly http = inject(GstzenHttpClient);
  private readonly config = inject(GSTR1_GSTZEN_AUTH_CONFIG);

  generateOtp(body: GstnGenerateOtpRequestBody): Observable<unknown> {
    return this.http.postJson(this.config.gstnGenerateOtpUrl, {
      gstin: body.gstin.trim().toUpperCase(),
      username: body.username.trim(),
    });
  }

  establishSession(body: GstnEstablishSessionRequestBody): Observable<unknown> {
    return this.http.postJson(this.config.gstnEstablishSessionUrl, {
      gstin: body.gstin.trim().toUpperCase(),
      otp: body.otp.trim(),
    });
  }

  checkGstinSession(
    body: GstnCheckSessionRequestBody,
  ): Observable<GstnCheckSessionSuccessResponse> {
    return this.http.postJson<GstnCheckSessionSuccessResponse>(
      this.config.gstnCheckSessionUrl,
      { gstin: body.gstin.trim().toUpperCase() },
    );
  }

  refreshGstinSession(body: GstnRefreshSessionRequestBody): Observable<unknown> {
    return this.http.postJson(this.config.gstnRefreshSessionUrl, {
      gstin: body.gstin.trim().toUpperCase(),
    });
  }
}
