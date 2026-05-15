/** GSTZen JWT + future GSTR-1 HTTP integration (see `libs/gstr1/README.md`). */
export interface Gstr1Environment {
  /**
   * `POST` GSTZen JWT login (`application/x-www-form-urlencoded`, fields `username`, `password`).
   * Production: `https://my.gstzen.in/accounts/api/login/token/` — local dev: `/gstzen-proxy/accounts/api/login/token/`.
   */
  readonly loginTokenUrl: string;
  /** Attach `Authorization` to same-origin `/gstzen-proxy/...` or absolute GSTZen URLs. */
  readonly bearerUrlPrefixes: readonly string[];
  readonly unauthorizedUrlPrefixes: readonly string[];
  /** Documented access token lifetime (fallback if JWT has no `exp`). Default 24h. */
  readonly accessTokenFallbackTtlMs: number;
  /** `POST` GSTN Generate OTP (Bearer access token). */
  readonly gstnGenerateOtpUrl: string;
  /** `POST` GSTN Establish Session (Bearer access token). */
  readonly gstnEstablishSessionUrl: string;
  /** `POST` GSTN Check Session — active vs inactive portal session for a GSTIN (Bearer). */
  readonly gstnCheckSessionUrl: string;
  /** `POST` GSTN Refresh Session — refresh GST portal session for a GSTIN (Bearer). */
  readonly gstnRefreshSessionUrl: string;
  /** `POST` Get return status — `gstin`, `ret_period`, `reference_id` (Bearer). */
  readonly gstnRetStatusUrl: string;
  /** `POST` Rettrack — view / track returns — `gstin`, `ret_period` (Bearer). */
  readonly gstnRettrackUrl: string;
  /** `POST` GSTR-1 download JSON — `gstin`, `ret_period`, `api_name` (Bearer). */
  readonly gstr1DownloadUrl: string;
  /** `POST` GSTR-1A download JSON — `gstin`, `ret_period`, `api_name` (Bearer). */
  readonly gstr1aDownloadUrl: string;
  /** `POST` GSTR-1 retsave — full return JSON payload (Bearer). */
  readonly gstr1RetsaveUrl: string;
}
