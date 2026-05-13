import type { EwaybillRowStatus } from './ewb-status';
import type { EwbGenerateRequest } from './ewb-gstzen.models';

/** Row shape for `public.eway_bills` (snake_case DB columns). */
export interface EwaybillDbRow {
  id: string;
  user_id: string;
  ewb_number: string | null;
  invoice_details: Record<string, unknown>;
  transporter_details: Record<string, unknown>;
  vehicle_details: Record<string, unknown>;
  request_payload: Record<string, unknown>;
  generated_response: Record<string, unknown>;
  cancel_response: Record<string, unknown>;
  cancel_reason: string | null;
  cancelled_at: string | null;
  status: EwaybillRowStatus;
  created_at: string;
  updated_at: string;
}

export interface EwaybillInsert {
  user_id: string;
  ewb_number?: string | null;
  invoice_details: Record<string, unknown>;
  transporter_details: Record<string, unknown>;
  vehicle_details: Record<string, unknown>;
  request_payload: Record<string, unknown>;
  generated_response: Record<string, unknown>;
  cancel_response?: Record<string, unknown>;
  cancel_reason?: string | null;
  cancelled_at?: string | null;
  status: EwaybillRowStatus;
}

export interface EwaybillListView {
  id: string;
  ewbNumber: string | null;
  status: EwaybillRowStatus;
  docNo: string | null;
  docDate: string | null;
  createdAt: string;
  fromGstin: string | null;
}

/** Partition of {@link EwbGenerateRequest} stored as JSON fragments + full request audit. */
export interface EwaybillPersistParts {
  invoice_details: Record<string, unknown>;
  transporter_details: Record<string, unknown>;
  vehicle_details: Record<string, unknown>;
  request: EwbGenerateRequest;
}
