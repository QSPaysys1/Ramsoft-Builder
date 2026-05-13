/**
 * GSTZen standalone e-way bill generate payload (NIC Part-A style).
 * Field names match GSTZen/NIC samples (e.g. `cessNonadvol` on line items, string `transDistance`).
 */
export interface EwbItemLine {
  productName: string;
  productDesc: string;
  hsnCode: number;
  quantity: number;
  qtyUnit: string;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  cessRate: number;
  /** NIC field spelling (lowercase `advol`). */
  cessNonadvol: number;
  taxableAmount: number;
}

export interface EwbGenerateRequest {
  supplyType: string;
  subSupplyType: string;
  subSupplyDesc: string;
  docType: string;
  docNo: string;
  /** DD/MM/YYYY */
  docDate: string;
  fromGstin: string;
  fromTrdName: string;
  fromAddr1: string;
  fromAddr2: string;
  fromPlace: string;
  fromPincode: number;
  actFromStateCode: number;
  fromStateCode: number;
  toGstin: string;
  toTrdName: string;
  toAddr1: string;
  toAddr2: string;
  toPlace: string;
  toPincode: number;
  actToStateCode: number;
  toStateCode: number;
  transactionType: number;
  /** NIC uses string for other charges; default `"0"`. */
  otherValue: string;
  totalValue: number;
  cgstValue: number;
  sgstValue: number;
  igstValue: number;
  cessValue: number;
  cessNonAdvolValue: number;
  totInvValue: number;
  transporterId: string;
  transporterName: string;
  transDocNo: string;
  transMode: string;
  /** NIC sample uses string distance (e.g. `"100"`). */
  transDistance: string;
  transDocDate: string;
  vehicleNo: string;
  vehicleType: string;
  itemList: EwbItemLine[];
}

/** Normalized success shape after {@link parseEwbGenerateResponse}. */
export interface EwbGenerateSuccess {
  ewbNo: string;
  ewbDate?: string;
  validUpto?: string;
  raw: Record<string, unknown>;
}

export interface EwbGenerateErrorShape {
  message: string;
  raw: Record<string, unknown>;
}

export type EwbGenerateParsed = EwbGenerateSuccess | EwbGenerateErrorShape;

export function isEwbGenerateSuccess(p: EwbGenerateParsed): p is EwbGenerateSuccess {
  return 'ewbNo' in p;
}

/**
 * NIC cancel reason codes (1–4). GSTZen accepts the numeric code in `cancelRsnCode`.
 * @see https://my.gstzen.in/docs/api/ewaybill-api/cancel-eway-bill/
 */
export type EwbCancelReasonCode = 1 | 2 | 3 | 4;

/** GSTZen standalone e-way bill cancel payload (NIC fields). */
export interface EwbCancelRequest {
  /** 12-digit EWB number returned at generation. */
  ewbNo: string | number;
  /** 1..4 (1: Duplicate, 2: Order cancelled, 3: Data entry mistake, 4: Others). */
  cancelRsnCode: EwbCancelReasonCode;
  /** Optional remarks (≤ 50 chars). */
  cancelRmrk?: string;
}

/** Normalized success shape after {@link parseEwbCancelResponse}. */
export interface EwbCancelSuccess {
  ewbNo: string;
  cancelDate?: string;
  raw: Record<string, unknown>;
}

export interface EwbCancelErrorShape {
  message: string;
  raw: Record<string, unknown>;
}

export type EwbCancelParsed = EwbCancelSuccess | EwbCancelErrorShape;

export function isEwbCancelSuccess(p: EwbCancelParsed): p is EwbCancelSuccess {
  return 'ewbNo' in p;
}

/** GSTZen standalone “get e-way bill” body (`ewbapi/getewb/`). */
export interface EwbGetRequest {
  /** 12-digit e-way bill number (number or numeric string in JSON). */
  ewbNo: string | number;
}

/**
 * Query string for GSTZen GET `ewbapi/get-ewb-transporter-view/` (`date`, `gstin`).
 *
 * @see https://my.gstzen.in/docs/api/ewaybill-api/get-ewb-transporter-view/
 */
export interface EwbTransporterViewQuery {
  /** ISO calendar date `YYYY-MM-DD` (GSTZen `date` query param). */
  date: string;
  /** Transporter GSTIN (`gstin` query param). */
  gstin: string;
}

/**
 * One normalized row from the transporter-view list; `raw` keeps the original object for forward compatibility.
 */
export interface EwbTransporterViewRow {
  /** 12-digit EWB number when present on the payload. */
  ewbNo: string;
  ewbDate?: string;
  validUpto?: string;
  status?: string;
  docNo?: string;
  docDate?: string;
  fromPlace?: string;
  toPlace?: string;
  vehicleNo?: string;
  transMode?: string;
  raw: Record<string, unknown>;
}

/** Result of {@link parseEwbTransporterViewResponse} / {@link GstZenEwbApiService#getEwbTransporterView}. */
export interface EwbTransporterViewResult {
  records: EwbTransporterViewRow[];
  /** Original JSON from GSTZen (array, object, or envelope). */
  raw: unknown;
  /**
   * When the API returns HTTP 200 with a message and no list (or empty list),
   * this surfaces `message` / `error` text for the UI without treating it as a client error.
   */
  notice?: string;
}

/**
 * Query string for GSTZen GET `ewbapi/get-ewb-transporter-state-view/` (`date`, `state_code`, `gstin`).
 *
 * @see https://my.gstzen.in/docs/api/ewaybill-api/get-ewb-transporter-state-view/
 */
export interface EwbTransporterStateViewQuery {
  /** ISO calendar date `YYYY-MM-DD` (GSTZen `date` query param). */
  date: string;
  /** NIC GST state code, typically two digits e.g. `"07"` (`state_code` query param). */
  state_code: string;
  /** Transporter GSTIN (`gstin` query param). */
  gstin: string;
}

/**
 * Normalized row from transporter **state** view; column set matches {@link EwbTransporterViewRow} because GSTZen list payloads align.
 */
export interface EwbTransporterStateViewRow {
  ewbNo: string;
  ewbDate?: string;
  validUpto?: string;
  status?: string;
  docNo?: string;
  docDate?: string;
  fromPlace?: string;
  toPlace?: string;
  vehicleNo?: string;
  transMode?: string;
  raw: Record<string, unknown>;
}

/** Result of {@link parseEwbTransporterStateViewResponse} / {@link GstZenEwbApiService#getEwbTransporterStateView}. */
export interface EwbTransporterStateViewResult {
  records: EwbTransporterStateViewRow[];
  raw: unknown;
  notice?: string;
}

/** NIC Part-B reason codes for vehicle / transport update (GSTZen samples use string codes). */
export type EwbPartBReasonCode = '1' | '2' | '3' | '4' | '5';

/** Transport mode codes (1 Road … 4 Ship), string in JSON per NIC samples. */
export type EwbTransModeCode = '1' | '2' | '3' | '4';

/**
 * GSTZen standalone update Part B POST body (`ewbapi/updatepartb/`).
 * CamelCase field names match GSTZen e-way API docs (same style as generate/cancel).
 *
 * @see https://my.gstzen.in/docs/api/ewaybill-api/update-partb/
 */
export interface EwbUpdatePartBRequest {
  ewbNo: string | number;
  fromPlace: string;
  fromState: number;
  reasonCode: string;
  reasonRem: string;
  transDocDate: string;
  transDocNo: string;
  transMode: string;
  vehicleNo: string;
}

/** Normalized success after {@link parseEwbUpdatePartBResponse}. */
export interface EwbUpdatePartBSuccess {
  ewbNo?: string;
  vehUpdDate?: string;
  raw: Record<string, unknown>;
}

export interface EwbUpdatePartBErrorShape {
  message: string;
  raw: Record<string, unknown>;
}

export type EwbUpdatePartBParsed = EwbUpdatePartBSuccess | EwbUpdatePartBErrorShape;

export function isEwbUpdatePartBSuccess(
  p: EwbUpdatePartBParsed,
): p is EwbUpdatePartBSuccess {
  return !('message' in p);
}

/**
 * GSTZen update transporter POST body (`ewbapi/update-transporter/`).
 *
 * @see https://my.gstzen.in/docs/api/ewaybill-api/update-transporter/
 */
export interface EwbUpdateTransporterRequest {
  ewbNo: string;
  transporterId: string;
}

/** Normalized success after {@link parseEwbUpdateTransporterResponse}. */
export interface EwbUpdateTransporterSuccess {
  ewbNo?: string;
  transporterId?: string;
  transUpdateDate?: string;
  raw: Record<string, unknown>;
}

export interface EwbUpdateTransporterErrorShape {
  message: string;
  raw: Record<string, unknown>;
}

export type EwbUpdateTransporterParsed =
  | EwbUpdateTransporterSuccess
  | EwbUpdateTransporterErrorShape;

export function isEwbUpdateTransporterSuccess(
  p: EwbUpdateTransporterParsed,
): p is EwbUpdateTransporterSuccess {
  return !('message' in p);
}

/**
 * NIC extension reason (`extnRsnCode`) values used by GSTZen `ewbapi/extend/`.
 * @see https://my.gstzen.in/docs/api/ewaybill-api/extend-eway-bill/
 */
export type EwbExtensionReasonCode = 1 | 2 | 3 | 4 | 5;

/** Consignment status for extension (`consignmentStatus`). */
export type EwbConsignmentStatusCode = 'M' | 'T';

/**
 * GSTZen extend e-way bill POST body (`ewbapi/extend/`).
 *
 * Numeric fields are sent as JSON numbers; `transMode` stays a string (`"1"`…`"4"`).
 *
 * @see https://my.gstzen.in/docs/api/ewaybill-api/extend-eway-bill/
 */
export interface EwbExtendRequest {
  ewbNo: number;
  vehicleNo: string;
  fromPlace: string;
  fromState: number;
  fromPincode: number;
  remainingDistance: number;
  transDocNo: string;
  /** DD/MM/YYYY */
  transDocDate: string;
  transMode: string;
  extnRsnCode: number;
  extnRemarks: string;
  transitType: string;
  consignmentStatus: string;
}

/** Normalized success after {@link parseEwbExtendResponse}. */
export interface EwbExtendSuccess {
  ewbNo?: string;
  /** Extended validity end / update timestamp when present on the NIC response. */
  validUpto?: string;
  extnRemarks?: string;
  raw: Record<string, unknown>;
}

export interface EwbExtendErrorShape {
  message: string;
  raw: Record<string, unknown>;
}

export type EwbExtendParsed = EwbExtendSuccess | EwbExtendErrorShape;

export function isEwbExtendSuccess(p: EwbExtendParsed): p is EwbExtendSuccess {
  return !('message' in p);
}

/** Stored on `eway_bill_transport_updates.request_payload` to distinguish extend vs Part-B vs transporter. */
export const EWB_TRANSPORT_AUDIT_KIND_KEY = '__transportOp' as const;
export type EwbTransportAuditOp =
  | 'extend'
  | 'multi_vehicle'
  | 'add_multi_vehicles'
  | 'change_multi_vehicles'
  | 'update_part_b'
  | 'update_transporter';

/**
 * GSTZen add multi-vehicles POST body (`ewbapi/add-multi-vehicles/`).
 * `transDocDate` is `DD/MM/YYYY` per NIC/GSTZen samples.
 */
export interface EwbMvGroupPostRequest {
  ewbNo: number;
  groupNo: string;
  vehicleNo: string;
  transDocNo: string;
  /** DD/MM/YYYY */
  transDocDate: string;
  quantity: number;
}

/** Normalized success after {@link parseEwbMvGroupPostResponse}. */
export interface EwbMvGroupPostSuccess {
  ewbNo?: string;
  raw: Record<string, unknown>;
}

export interface EwbMvGroupPostErrorShape {
  message: string;
  raw: Record<string, unknown>;
}

export type EwbMvGroupPostParsed =
  | EwbMvGroupPostSuccess
  | EwbMvGroupPostErrorShape;

export function isEwbMvGroupPostSuccess(
  p: EwbMvGroupPostParsed,
): p is EwbMvGroupPostSuccess {
  return !('message' in p);
}

/**
 * GSTZen change multi vehicles POST body (`ewbapi/change-multi-vehicles/`).
 * Field `oldvehicleNo` matches NIC sample spelling (lowercase `vehicle` segment).
 */
export interface EwbChangeMultiVehiclesRequest {
  ewbNo: number;
  groupNo: number;
  oldvehicleNo: string;
  newVehicleNo: string;
  oldTranNo: string;
  newTranNo: string;
  fromPlace: string;
  fromState: number;
  reasonCode: string;
  reasonRem: string;
}

/** Normalized success after {@link parseEwbChangeMultiVehiclesResponse}. */
export interface EwbChangeMultiVehiclesSuccess {
  ewbNo?: string;
  raw: Record<string, unknown>;
}

export interface EwbChangeMultiVehiclesErrorShape {
  message: string;
  raw: Record<string, unknown>;
}

export type EwbChangeMultiVehiclesParsed =
  | EwbChangeMultiVehiclesSuccess
  | EwbChangeMultiVehiclesErrorShape;

export function isEwbChangeMultiVehiclesSuccess(
  p: EwbChangeMultiVehiclesParsed,
): p is EwbChangeMultiVehiclesSuccess {
  return !('message' in p);
}

/**
 * NIC uses the same `ewbapi/extend/` body for extension and for initiating multi-vehicle movement
 * (`consignmentStatus` etc.). Alias keeps call sites self-documenting.
 */
export type EwbMultiVehicleMovementRequest = EwbExtendRequest;
