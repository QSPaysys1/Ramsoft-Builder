import type {
  EwaybillDbRow,
  EwbConsignmentStatusCode,
  EwbExtendRequest,
} from '@ramsoft-builder/ewaybills/models/ewb';
import { normalizeDocDateForApi } from './ewb-date-format';
import {
  normalizeEwbTransModeForApi,
  pickEwbNoFromEwaybillRow,
} from './ewb-update-partb-draft';

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}

function str(r: Record<string, unknown>, key: string): string {
  const v = r[key];
  return v == null ? '' : String(v).trim();
}

function numState(r: Record<string, unknown>): number {
  for (const k of ['fromStateCode', 'actFromStateCode', 'FromState', 'fromState']) {
    const v = r[k];
    const n = typeof v === 'number' ? v : Number(v);
    if (Number.isFinite(n) && n > 0) {
      return n;
    }
  }
  return 0;
}

function numPincode(r: Record<string, unknown>): number {
  for (const k of ['fromPincode', 'FromPincode', 'ActFromPinCode', 'from_pincode']) {
    const v = r[k];
    const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(/\D/g, '').slice(0, 6));
    if (Number.isFinite(n) && n >= 100000) {
      return Math.trunc(n);
    }
  }
  return 0;
}

function remainingDistanceFromRow(tr: Record<string, unknown>, req: Record<string, unknown>): number {
  for (const rec of [req, tr]) {
    for (const k of ['remainingDistance', 'transDistance', 'TransDistance']) {
      const v = rec[k];
      const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(/[^\d.-]/g, ''));
      if (Number.isFinite(n) && n > 0) {
        return Math.max(0, Math.round(n));
      }
    }
  }
  return 0;
}

/**
 * Draft fields for the extend form — coerced to GSTZen types on submit via
 * {@link mapFormValuesToEwbExtendRequest}.
 */
export interface EwbExtendDraftFormValues {
  vehicleNo: string;
  fromPlace: string;
  fromState: number;
  fromPincode: number;
  remainingDistance: number;
  transDocNo: string;
  transDocDate: string;
  transMode: string;
  /** Form control value (`"1"`–`"5"` from &lt;select&gt;). */
  extnRsnCode: string;
  extnRemarks: string;
  transitType: string;
  consignmentStatus: EwbConsignmentStatusCode;
}

/**
 * Build extend form defaults from a saved e-way bill (user must complete missing required fields).
 */
export function buildExtendDraftFromEwaybillRow(
  row: EwaybillDbRow,
): { ewbNo: number; draft: EwbExtendDraftFormValues } | null {
  const ewbRaw = pickEwbNoFromEwaybillRow(row);
  if (!ewbRaw) {
    return null;
  }
  const inv = asRecord(row.invoice_details);
  const tr = asRecord(row.transporter_details);
  const veh = asRecord(row.vehicle_details);
  const req = asRecord(row.request_payload);

  const fromPlace =
    str(inv, 'fromPlace') || str(req, 'fromPlace') || str(inv, 'FromPlace');
  const fromState = numState(inv) || numState(req);
  const fromPincode = numPincode(inv) || numPincode(req);
  const transDocNo = str(tr, 'transDocNo') || str(req, 'transDocNo');
  let transDocDate = str(tr, 'transDocDate') || str(req, 'transDocDate');
  transDocDate = normalizeDocDateForApi(transDocDate);
  const transModeRaw = str(tr, 'transMode') || str(req, 'transMode') || '1';
  const transMode = normalizeEwbTransModeForApi(transModeRaw);
  const vehicleNo = (
    str(veh, 'vehicleNo') ||
    str(req, 'vehicleNo') ||
    ''
  ).toUpperCase();
  const rd = remainingDistanceFromRow(tr, req);

  const ewbNoNum = Number(String(ewbRaw).replace(/\s+/g, ''));
  const draft: EwbExtendDraftFormValues = {
    vehicleNo,
    fromPlace: fromPlace || '',
    fromState: fromState || 0,
    fromPincode: fromPincode || 0,
    remainingDistance: rd,
    transDocNo,
    transDocDate,
    transMode,
    extnRsnCode: '1',
    extnRemarks: '',
    transitType: '',
    consignmentStatus: 'M',
  };
  return {
    ewbNo: Number.isFinite(ewbNoNum) ? ewbNoNum : Number(String(ewbRaw).replace(/\D/g, '').slice(0, 12)),
    draft,
  };
}

/** Merge GSTZen `getewb` payload into an extend draft (best-effort key variants). */
export function mergeGetEwbIntoExtendDraft(
  getBody: Record<string, unknown>,
  current: EwbExtendDraftFormValues,
): EwbExtendDraftFormValues {
  const flat = { ...getBody };
  for (const wrap of ['data', 'result', 'response', 'Result'] as const) {
    const v = getBody[wrap];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(flat, v as Record<string, unknown>);
    }
  }
  const fromPlace =
    str(flat, 'fromPlace') ||
    str(flat, 'FromPlace') ||
    str(flat, 'from_place') ||
    current.fromPlace;
  const fromState = numState(flat) || current.fromState;
  const fromPincode = numPincode(flat) || current.fromPincode;
  const transDocNo =
    str(flat, 'transDocNo') || str(flat, 'TransDocNo') || current.transDocNo;
  let transDocDate =
    str(flat, 'transDocDate') || str(flat, 'TransDocDate') || current.transDocDate;
  transDocDate = normalizeDocDateForApi(transDocDate);
  const transModeRaw =
    str(flat, 'transMode') || str(flat, 'TransMode') || current.transMode;
  const transMode = normalizeEwbTransModeForApi(transModeRaw);
  const vehicleNo = (
    str(flat, 'vehicleNo') ||
    str(flat, 'VehicleNo') ||
    current.vehicleNo
  ).toUpperCase();
  const rd = remainingDistanceFromRow(flat, flat) || current.remainingDistance;

  return {
    ...current,
    fromPlace,
    fromState: fromState || current.fromState,
    fromPincode: fromPincode || current.fromPincode,
    transDocNo,
    transDocDate,
    transMode,
    vehicleNo: vehicleNo || current.vehicleNo,
    remainingDistance: rd > 0 ? rd : current.remainingDistance,
  };
}

/** Map validated form values + ewb number to GSTZen `ewbapi/extend/` JSON (numeric fields as numbers). */
export function mapFormValuesToEwbExtendRequest(
  ewbNo: number,
  v: EwbExtendDraftFormValues,
): EwbExtendRequest {
  const transDocDate = normalizeDocDateForApi(v.transDocDate);
  return {
    ewbNo,
    vehicleNo: String(v.vehicleNo ?? '').trim().toUpperCase(),
    fromPlace: String(v.fromPlace ?? '').trim(),
    fromState: Math.trunc(Number(v.fromState)),
    fromPincode: Math.trunc(Number(v.fromPincode)),
    remainingDistance: Math.max(0, Math.round(Number(v.remainingDistance))),
    transDocNo: String(v.transDocNo ?? '').trim(),
    transDocDate,
    transMode: normalizeEwbTransModeForApi(v.transMode),
    extnRsnCode: Math.trunc(Number.parseInt(String(v.extnRsnCode), 10)) || 1,
    extnRemarks: String(v.extnRemarks ?? '').trim(),
    transitType: String(v.transitType ?? '').trim(),
    consignmentStatus: v.consignmentStatus === 'T' ? 'T' : 'M',
  };
}
