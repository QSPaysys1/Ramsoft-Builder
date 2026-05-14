/**
 * GSTZen `POST /api/rettrack/` — list filed returns for a period (Bearer access token).
 */
export interface GstnRettrackRequestBody {
  readonly gstin: string;
  readonly ret_period: string;
}
