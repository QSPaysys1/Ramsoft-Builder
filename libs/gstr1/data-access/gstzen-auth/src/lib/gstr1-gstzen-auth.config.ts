import { InjectionToken } from '@angular/core';

/**
 * GSTZen portal JWT auth (`POST /accounts/api/login/token/`).
 * Documented endpoint: `https://my.gstzen.in/accounts/api/login/token/`.
 * Use `provideGstr1GstzenAuthConfig()` with values from `environment.gstr1`.
 */
export interface Gstr1GstzenAuthEnvironment {
  /** Full URL for the token endpoint (include trailing slash if your server expects it). */
  readonly loginTokenUrl: string;
  /**
   * Request URL prefixes that should receive `Authorization: Bearer <access>`.
   * Dev: include `/gstzen-proxy` so proxied GSTZen calls are covered.
   */
  readonly bearerUrlPrefixes: readonly string[];
  /**
   * Prefixes used to detect GSTZen API 401 responses for logout/session handling.
   * Usually the same as `bearerUrlPrefixes`.
   */
  readonly unauthorizedUrlPrefixes: readonly string[];
  /**
   * Fallback lifetime when `exp` is missing on the access token (GSTZen: 24 hours).
   * @default 86_400_000
   */
  readonly accessTokenFallbackTtlMs?: number;
  /** localStorage key namespace; default `ramsoft.gstr1.auth`. */
  readonly storageKeyPrefix?: string;
  /**
   * GSTN Generate OTP API — `POST` JSON (`gstin`, `username`).
   * Production: `https://my.gstzen.in/api/gstn-generate-otp/`.
   */
  readonly gstnGenerateOtpUrl: string;
  /**
   * GSTN Establish Session API — `POST` JSON (`gstin`, `otp`).
   * Production: `https://my.gstzen.in/api/gstn-establish-session/`.
   */
  readonly gstnEstablishSessionUrl: string;
  /**
   * GSTN Check Session API — `POST` JSON (`gstin`) — portal session active vs inactive.
   * Production: `https://my.gstzen.in/api/gstn-check-session/`.
   */
  readonly gstnCheckSessionUrl: string;
  /**
   * GSTN Refresh Session API — `POST` JSON (`gstin`) — renew GST portal session for the GSTIN.
   * Production: `https://my.gstzen.in/api/gstn-refresh-session/`.
   */
  readonly gstnRefreshSessionUrl: string;
  /**
   * All / Get Return Status — `POST` JSON (`gstin`, `ret_period`, `reference_id`).
   * Production: `https://my.gstzen.in/api/retstatus/`.
   */
  readonly gstnRetStatusUrl: string;
  /**
   * Rettrack — View / track filed returns — `POST` JSON (`gstin`, `ret_period`).
   * Production: `https://my.gstzen.in/api/rettrack/`.
   */
  readonly gstnRettrackUrl: string;
  /**
   * GSTR-1 section download — `POST` JSON (`gstin`, `ret_period`, `api_name`).
   * Production: `https://my.gstzen.in/api/gstr1/download/`.
   */
  readonly gstr1DownloadUrl: string;
  /**
   * GSTR-1A section download — `POST` JSON (`gstin`, `ret_period`, `api_name`).
   * Production: `https://my.gstzen.in/api/gstr1a/download/`.
   */
  readonly gstr1aDownloadUrl: string;
}

export const GSTR1_GSTZEN_AUTH_CONFIG = new InjectionToken<Gstr1GstzenAuthEnvironment>(
  'GSTR1_GSTZEN_AUTH_CONFIG',
);
