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
  /**
   * GSTR-1 proceed / reset — `POST` JSON (`gstin`, `ret_period`) (“Proceed to file / Summary”).
   * Production: `https://my.gstzen.in/api/gstr1/reset/`.
   */
  readonly gstr1ResetUrl: string;
  /**
   * GSTR-1 return save / retsave — `POST` JSON body per GSTZen (sections such as `b2b`, `fp`, `gstin`, `gt`, `cur_gt`).
   * Production: `https://my.gstzen.in/api/gstr1/retsave/`.
   */
  readonly gstr1RetsaveUrl: string;
  /**
   * GSTR-1A return save / retsave — same JSON shape as GSTR-1 retsave for the active section.
   * Production: `https://my.gstzen.in/api/gstr1a/retsave/`.
   */
  readonly gstr1aRetsaveUrl: string;
  /**
   * GSTR-2A B2B supplier summary — `POST` JSON (`gstin`, `ret_period`).
   * Production: `https://my.gstzen.in/api/gstr2/b2b/`.
   */
  readonly gstr2B2bUrl: string;
  /**
   * GSTR-2A amendments to B2B — `POST` JSON (`gstin`, `ret_period`).
   * Production: `https://my.gstzen.in/api/gstr2/b2ba/`.
   */
  readonly gstr2B2baUrl: string;
  /**
   * GSTR-2A amendments to credit/debit notes — `POST` JSON (`gstin`, `ret_period`).
   * Production: `https://my.gstzen.in/api/gstr2/cdna/`.
   */
  readonly gstr2CdnaUrl: string;
  /**
   * GSTR-2A ECO documents — `POST` JSON (`gstin`, `ret_period`).
   * Production: `https://my.gstzen.in/api/gstr2/ecom/`.
   */
  readonly gstr2EcomUrl: string;
  /**
   * GSTR-2A amendments to ECO documents — `POST` JSON (`gstin`, `ret_period`).
   * Production: `https://my.gstzen.in/api/gstr2/ecoma/`.
   */
  readonly gstr2EcomaUrl: string;
  /**
   * GSTR-2A ISD credits — `POST` JSON (`gstin`, `ret_period`).
   * Production: `https://my.gstzen.in/api/gstr2/isd/`.
   */
  readonly gstr2IsdUrl: string;
  /**
   * GSTR-2A TDS / TDS amendments / TCS — `POST` JSON (`gstin`, `ret_period`).
   * Production: `https://my.gstzen.in/api/gstr2/tdstcs/`.
   */
  readonly gstr2TdstcsUrl: string;
  /**
   * GSTR-2A imports on bill of entry (overseas) — `POST` JSON (`gstin`, `ret_period`).
   * Production: `https://my.gstzen.in/api/gstr2/impg/`.
   */
  readonly gstr2ImpgUrl: string;
  /**
   * GSTR-2A SEZ imports on bill of entry — `POST` JSON (`gstin`, `ret_period`).
   * Production: `https://my.gstzen.in/api/gstr2/impgsez/`.
   */
  readonly gstr2ImpgsezUrl: string;
  /**
   * GSTR-2B auto-drafted ITC — `POST` JSON (`gstin`, `ret_period`).
   * Production: `https://my.gstzen.in/api/gstr2/2b/`.
   */
  readonly gstr22bUrl: string;
  /**
   * GSTR-2A credit/debit notes — `POST` JSON (`gstin`, `ret_period`).
   * Production: `https://my.gstzen.in/api/gstr2/cdn/`.
   */
  readonly gstr2CdnUrl: string;
}

export const GSTR1_GSTZEN_AUTH_CONFIG = new InjectionToken<Gstr1GstzenAuthEnvironment>(
  'GSTR1_GSTZEN_AUTH_CONFIG',
);
