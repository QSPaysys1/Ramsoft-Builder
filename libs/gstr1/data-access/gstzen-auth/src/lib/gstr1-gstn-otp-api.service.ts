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
import type { GstnRetStatusRequestBody } from './gstn-ret-status.models';
import type { GstnRettrackRequestBody } from './gstn-rettrack.models';
import type {
  Gstr1aDownloadRequestBody,
  Gstr1ResetRequestBody,
  Gstr1DownloadRequestBody,
} from './gstr1-download.models';
import type { Gstr2B2bRequestBody } from './gstr2-b2b.models';
import type { Gstr2B2baRequestBody } from './gstr2-b2ba.models';
import type { Gstr2ImpgRequestBody } from './gstr2-impg.models';
import type { Gstr2ImpgsezRequestBody } from './gstr2-impgsez.models';
import type { Gstr2TdstcsRequestBody } from './gstr2-tdstcs.models';
import type { Gstr2IsdRequestBody } from './gstr2-isd.models';
import type { Gstr2EcomaRequestBody } from './gstr2-ecoma.models';
import type { Gstr2EcomRequestBody } from './gstr2-ecom.models';
import type { Gstr2CdnaRequestBody } from './gstr2-cdna.models';
import type { Gstr2CdnRequestBody } from './gstr2-cdn.models';
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

  /** `POST retstatus/` — Bearer token attached by `gstr1BearerInterceptor`. */
  getReturnStatus(body: GstnRetStatusRequestBody): Observable<unknown> {
    return this.http.post<unknown>(
      this.config.gstnRetStatusUrl,
      {
        gstin: body.gstin.trim().toUpperCase(),
        ret_period: body.ret_period.trim(),
        reference_id: body.reference_id.trim(),
      },
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  /** `POST rettrack/` — Bearer token attached by `gstr1BearerInterceptor`. */
  viewAndTrackReturns(body: GstnRettrackRequestBody): Observable<unknown> {
    return this.http.post<unknown>(
      this.config.gstnRettrackUrl,
      {
        gstin: body.gstin.trim().toUpperCase(),
        ret_period: body.ret_period.trim(),
      },
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  /** `POST api/gstr1/download/` — Bearer token attached by `gstr1BearerInterceptor`. */
  downloadGstr1Return(body: Gstr1DownloadRequestBody): Observable<unknown> {
    return this.http.post<unknown>(
      this.config.gstr1DownloadUrl,
      {
        gstin: body.gstin.trim().toUpperCase(),
        ret_period: body.ret_period.trim(),
        api_name: body.api_name,
      },
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  /** `POST api/gstr1a/download/` — Bearer token attached by `gstr1BearerInterceptor`. */
  downloadGstr1aReturn(body: Gstr1aDownloadRequestBody): Observable<unknown> {
    return this.http.post<unknown>(
      this.config.gstr1aDownloadUrl,
      {
        gstin: body.gstin.trim().toUpperCase(),
        ret_period: body.ret_period.trim(),
        api_name: body.api_name,
      },
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  /** `POST api/gstr1/reset/` — GSTR‑1 proceed to file (Bearer). */
  resetGstr1Proceed(body: Gstr1ResetRequestBody): Observable<unknown> {
    return this.http.post<unknown>(
      this.config.gstr1ResetUrl,
      {
        gstin: body.gstin.trim().toUpperCase(),
        ret_period: body.ret_period.trim(),
      },
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  /**
   * `POST api/gstr1/retsave/` — persist GSTR-1 data (e.g. `b2b` buckets). Bearer token applied by interceptor.
   */
  retsaveGstr1Return(body: Record<string, unknown>): Observable<unknown> {
    return this.http.post<unknown>(this.config.gstr1RetsaveUrl, body, {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * `POST api/gstr1a/retsave/` — persist GSTR-1A section data (Bearer). Same envelope fields as GSTR-1 retsave.
   */
  retsaveGstr1aReturn(body: Record<string, unknown>): Observable<unknown> {
    return this.http.post<unknown>(this.config.gstr1aRetsaveUrl, body, {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /** `POST api/gstr2/b2b/` — GSTR-2A B2B supplier summary (Bearer). */
  fetchGstr2B2b(body: Gstr2B2bRequestBody): Observable<unknown> {
    return this.http.post<unknown>(
      this.config.gstr2B2bUrl,
      {
        gstin: body.gstin.trim().toUpperCase(),
        ret_period: body.ret_period.trim(),
      },
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  /** `POST api/gstr2/b2ba/` — GSTR-2A amendments to B2B supplier summary (Bearer). */
  fetchGstr2B2ba(body: Gstr2B2baRequestBody): Observable<unknown> {
    return this.http.post<unknown>(
      this.config.gstr2B2baUrl,
      {
        gstin: body.gstin.trim().toUpperCase(),
        ret_period: body.ret_period.trim(),
      },
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  /** `POST api/gstr2/cdna/` — GSTR-2A amendments to CDN supplier summary (Bearer). */
  fetchGstr2Cdna(body: Gstr2CdnaRequestBody): Observable<unknown> {
    return this.http.post<unknown>(
      this.config.gstr2CdnaUrl,
      {
        gstin: body.gstin.trim().toUpperCase(),
        ret_period: body.ret_period.trim(),
      },
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  /** `POST api/gstr2/ecoma/` — GSTR-2A amendments to ECO documents (Bearer). */
  fetchGstr2Ecoma(body: Gstr2EcomaRequestBody): Observable<unknown> {
    return this.http.post<unknown>(
      this.config.gstr2EcomaUrl,
      {
        gstin: body.gstin.trim().toUpperCase(),
        ret_period: body.ret_period.trim(),
      },
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  /** `POST api/gstr2/ecom/` — GSTR-2A ECO documents (Bearer). */
  fetchGstr2Ecom(body: Gstr2EcomRequestBody): Observable<unknown> {
    return this.http.post<unknown>(
      this.config.gstr2EcomUrl,
      {
        gstin: body.gstin.trim().toUpperCase(),
        ret_period: body.ret_period.trim(),
      },
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  /** `POST api/gstr2/isd/` — GSTR-2A ISD credits (Bearer). */
  fetchGstr2Isd(body: Gstr2IsdRequestBody): Observable<unknown> {
    return this.http.post<unknown>(
      this.config.gstr2IsdUrl,
      {
        gstin: body.gstin.trim().toUpperCase(),
        ret_period: body.ret_period.trim(),
      },
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  /** `POST api/gstr2/tdstcs/` — GSTR-2A TDS / TDSA / TCS credits (Bearer). */
  fetchGstr2Tdstcs(body: Gstr2TdstcsRequestBody): Observable<unknown> {
    return this.http.post<unknown>(
      this.config.gstr2TdstcsUrl,
      {
        gstin: body.gstin.trim().toUpperCase(),
        ret_period: body.ret_period.trim(),
      },
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  /** `POST api/gstr2/impg/` — GSTR-2A import of goods on bill of entry (Bearer). */
  fetchGstr2Impg(body: Gstr2ImpgRequestBody): Observable<unknown> {
    return this.http.post<unknown>(
      this.config.gstr2ImpgUrl,
      {
        gstin: body.gstin.trim().toUpperCase(),
        ret_period: body.ret_period.trim(),
      },
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  /** `POST api/gstr2/impgsez/` — GSTR-2A SEZ import on bill of entry (Bearer). */
  fetchGstr2Impgsez(body: Gstr2ImpgsezRequestBody): Observable<unknown> {
    return this.http.post<unknown>(
      this.config.gstr2ImpgsezUrl,
      {
        gstin: body.gstin.trim().toUpperCase(),
        ret_period: body.ret_period.trim(),
      },
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  /** `POST api/gstr2/cdn/` — GSTR-2A credit/debit notes (Bearer). */
  fetchGstr2Cdn(body: Gstr2CdnRequestBody): Observable<unknown> {
    return this.http.post<unknown>(
      this.config.gstr2CdnUrl,
      {
        gstin: body.gstin.trim().toUpperCase(),
        ret_period: body.ret_period.trim(),
      },
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}
