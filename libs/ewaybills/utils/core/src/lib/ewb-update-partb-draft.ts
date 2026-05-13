import type {
  EwaybillDbRow,
  EwbTransModeCode,
  EwbUpdatePartBRequest,
} from '@ramsoft-builder/ewaybills/models/ewb';
import { normalizeDocDateForApi } from './ewb-date-format';

/** NIC transport mode is a single digit 1–4; APIs sometimes return suffixes (e.g. `1-Road`). */
export function normalizeEwbTransModeForApi(raw: unknown): EwbTransModeCode {
  const s = String(raw ?? '').trim();
  if (/^[1-4]$/.test(s)) {
    return s as EwbTransModeCode;
  }
  const t = s.toLowerCase();
  const prefixed = t.match(/^([1-4])[^0-9]/);
  if (prefixed) {
    return prefixed[1] as EwbTransModeCode;
  }
  if (t.includes('rail')) {
    return '2';
  }
  if (t.includes('air')) {
    return '3';
  }
  if (t.includes('ship') || t.includes('sea') || t.includes('vessel')) {
    return '4';
  }
  if (t.includes('road')) {
    return '1';
  }
  return '1';
}

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

/** 12-digit EWB number from DB row (`ewb_number`, generate response, or request). */
export function pickEwbNoFromEwaybillRow(row: EwaybillDbRow): string | null {
  if (row.ewb_number?.trim()) {
    return row.ewb_number.trim();
  }
  const gen = asRecord(row.generated_response);
  const fromGen =
    str(gen, 'ewbNo') || str(gen, 'EwbNo') || str(gen, 'ewayBillNo');
  if (fromGen) {
    return fromGen;
  }
  const req = asRecord(row.request_payload);
  const fromReq = str(req, 'ewbNo');
  return fromReq || null;
}

/**
 * Builds a GSTZen update Part B request draft from a persisted e-way bill row.
 * Missing NIC fields fall back to empty strings / 0 where the UI must validate before submit.
 */
export function buildUpdatePartBRequestFromEwaybillRow(
  row: EwaybillDbRow,
): EwbUpdatePartBRequest | null {
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

  const ewbNoNum = Number(String(ewbRaw).replace(/\s+/g, ''));
  const body: EwbUpdatePartBRequest = {
    ewbNo: Number.isFinite(ewbNoNum) ? ewbNoNum : ewbRaw,
    fromPlace: fromPlace || '',
    fromState: fromState || 0,
    reasonCode: '1',
    reasonRem: '',
    transDocDate: transDocDate,
    transDocNo: transDocNo,
    transMode: transMode,
    vehicleNo: vehicleNo,
  };
  return body;
}

/** Merge live `ewbapi/getewb` JSON into an existing draft (best-effort key variants). */
export function mergeGetEwbResponseIntoUpdatePartBRequest(
  getBody: Record<string, unknown>,
  current: EwbUpdatePartBRequest,
): EwbUpdatePartBRequest {
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
  const fromState =
    numState(flat) || current.fromState;
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
  const ewb =
    str(flat, 'ewbNo') || str(flat, 'EwbNo') || String(current.ewbNo).replace(/\s+/g, '');
  const ewbNum = Number(ewb.replace(/\s+/g, ''));
  return {
    ...current,
    ewbNo: Number.isFinite(ewbNum) ? ewbNum : current.ewbNo,
    fromPlace: fromPlace,
    fromState: fromState || current.fromState,
    transDocNo: transDocNo,
    transDocDate: transDocDate,
    transMode: transMode,
    vehicleNo: vehicleNo || current.vehicleNo,
  };
}
