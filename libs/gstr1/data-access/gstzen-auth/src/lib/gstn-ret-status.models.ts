/**
 * GSTZen `POST /api/retstatus/` — polling return status with a portal reference id (Bearer access token).
 */
export interface GstnRetStatusRequestBody {
  readonly gstin: string;
  readonly ret_period: string;
  readonly reference_id: string;
}
