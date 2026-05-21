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
  /** `POST` GSTR-1 proceed / reset — `gstin`, `ret_period` (Bearer). */
  readonly gstr1ResetUrl: string;
  /** `POST` GSTR-1 retsave — full return JSON payload (Bearer). */
  readonly gstr1RetsaveUrl: string;
  /** `POST` GSTR-1A retsave — section payload with `fp`, `gstin`, `gt`, `cur_gt` (Bearer). */
  readonly gstr1aRetsaveUrl: string;
  /** `POST` GSTR-2A B2B suppliers — `gstin`, `ret_period` (Bearer). */
  readonly gstr2B2bUrl: string;
  /** `POST` GSTR-2A amendments to B2B — `gstin`, `ret_period` (Bearer). */
  readonly gstr2B2baUrl: string;
  readonly gstr2CdnaUrl: string;
  readonly gstr2EcomUrl: string;
  readonly gstr2EcomaUrl: string;
  readonly gstr2IsdUrl: string;
  readonly gstr2TdstcsUrl: string;
  readonly gstr2ImpgUrl: string;
  readonly gstr2ImpgsezUrl: string;
  readonly gstr22bUrl: string;
  readonly gstr2CdnUrl: string;
  readonly gstr3bAutoliabUrl: string;
  /** `POST` GSTR-3B retsave — full return JSON payload (Bearer). */
  readonly gstr3bRetsaveUrl: string;
  /** `POST` GSTR-3B retsum — saved return summary (Bearer). */
  readonly gstr3bRetsumUrl: string;
}
