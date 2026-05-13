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
