import type { EwaybillRowStatus } from './ewb-status';
import type { EwbGenerateRequest } from './ewb-gstzen.models';

export type EwaybillTransportUpdateRowStatus = 'pending' | 'success' | 'failed';

export type EwaybillTransportLastStatus = 'success' | 'failed';

/** Row shape for `public.eway_bill_transport_updates`. */
export interface EwaybillTransportUpdateDbRow {
  id: string;
  user_id: string;
  eway_bill_id: string;
  request_payload: Record<string, unknown>;
  response: Record<string, unknown>;
  status: EwaybillTransportUpdateRowStatus;
  error_message: string | null;
  vehicle_no_before: string | null;
  vehicle_no_after: string | null;
  created_at: string;
}

export interface EwaybillTransportUpdateInsert {
  user_id: string;
  eway_bill_id: string;
  request_payload: Record<string, unknown>;
  response: Record<string, unknown>;
  status: EwaybillTransportUpdateRowStatus;
  error_message?: string | null;
  vehicle_no_before?: string | null;
  vehicle_no_after?: string | null;
}

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
  /** Present after `20260513140000_eway_bill_transport_updates` migration. */
  transport_last_status?: EwaybillTransportLastStatus | null;
  transport_last_at?: string | null;
  transport_success_count?: number;
  transport_last_vehicle_changed?: boolean;
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
  transporterLabel: string | null;
  vehicleNo: string | null;
  transportLastStatus: EwaybillTransportLastStatus | null;
  transportLastAt: string | null;
  transportSuccessCount: number;
  transportLastVehicleChanged: boolean;
}

/** Partition of {@link EwbGenerateRequest} stored as JSON fragments + full request audit. */
export interface EwaybillPersistParts {
  invoice_details: Record<string, unknown>;
  transporter_details: Record<string, unknown>;
  vehicle_details: Record<string, unknown>;
  request: EwbGenerateRequest;
}

/** Transport / Part-B list filter chips (saved e-way bills). */
export type EwaybillSavedListTransportFilter =
  | 'all'
  | 'success'
  | 'failed'
  | 'pending'
  | 'updated'
  | 'vehicle_changed';
