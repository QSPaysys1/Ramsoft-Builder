import type {
  EwaybillPersistParts,
  EwbCancelParsed,
  EwbCancelSuccess,
  EwbGenerateParsed,
  EwbGenerateRequest,
  EwbGenerateSuccess,
  EwbItemLine,
  EwbUpdatePartBParsed,
  EwbUpdatePartBSuccess,
  EwbUpdateTransporterParsed,
  EwbUpdateTransporterSuccess,
} from '@ramsoft-builder/ewaybills/models/ewb';
import { normalizeDocDateForApi } from './ewb-date-format';

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function gstinValidator(controlValue: string | null | undefined): boolean {
  const v = (controlValue ?? '').trim().toUpperCase();
  return v.length === 15 && GSTIN_RE.test(v);
}

/** 12-digit e-way bill number string, or `null` if input is not exactly 12 digits. */
export function normalizeEwbNoTo12Digits(
  v: string | number | null | undefined,
): string | null {
  const digits = String(v ?? '').replace(/\D/g, '');
  return digits.length === 12 ? digits : null;
}

export function pincodeValidator(v: string | number | null | undefined): boolean {
  const s = String(v ?? '').trim();
  return /^\d{6}$/.test(s);
}

function num(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function num0(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** First two digits of GSTIN as state code when valid (01–38 style). */
function stateCodeFromGstin(gstin: string): number | null {
  const v = gstin.trim().toUpperCase();
  if (v.length < 2) {
    return null;
  }
  const n = parseInt(v.slice(0, 2), 10);
  if (!Number.isFinite(n) || n < 1 || n > 38) {
    return null;
  }
  return n;
}

/** Flat form value → NIC-style generate JSON (single line item if list empty). */
export function mapEwbFormToRequest(form: Record<string, unknown>): EwbGenerateRequest {
  const inv = asRecord(form['invoice']);
  const tr = asRecord(form['transporter']);
  const veh = asRecord(form['vehicle']);
  const itemsRaw = form['items'];
  const items = Array.isArray(itemsRaw)
    ? (itemsRaw as Record<string, unknown>[])
    : [defaultItemFromForm(inv)];

  const fromStateCode = num(inv['fromStateCode'], 0);
  const toStateCode = num(inv['toStateCode'], 0);
  const toGstin = str(inv['toGstin']).trim().toUpperCase();
  const actToStateCode = stateCodeFromGstin(toGstin) ?? toStateCode;
  const transDistNum = num(inv['transDistance'], 0);

  const cgstValue = num0(inv['cgstValue']);
  const sgstValue = num0(inv['sgstValue']);
  const igstValue = num0(inv['igstValue']);
  const cessValue = num0(inv['cessValue']);
  const cessNonAdvolValue = num0(inv['cessNonAdvolValue']);
  const totalValue = num0(inv['totalValue']);
  const rawTotInv = inv['totInvValue'];
  const hasManualTotInv =
    rawTotInv !== null &&
    rawTotInv !== undefined &&
    String(rawTotInv).trim() !== '' &&
    Number.isFinite(Number(rawTotInv));
  const totInvValue = hasManualTotInv
    ? round2(Number(rawTotInv))
    : round2(totalValue + cgstValue + sgstValue + igstValue + cessValue + cessNonAdvolValue);

  const itemList: EwbItemLine[] = items.map((it) => {
    const pn = str(it['productName']) || 'Goods';
    const desc = optStr(it['productDesc']);
    return {
      productName: pn,
      productDesc: desc ?? pn,
      hsnCode: num(it['hsnCode'], 0),
      quantity: num(it['quantity'], 0),
      qtyUnit: str(it['qtyUnit']) || 'NOS',
      cgstRate: optNum(it['cgstRate']) ?? 0,
      sgstRate: optNum(it['sgstRate']) ?? 0,
      igstRate: optNum(it['igstRate']) ?? 0,
      cessRate: optNum(it['cessRate']) ?? 0,
      cessNonadvol: optNum(it['cessNonAdvol']) ?? 0,
      taxableAmount: num(it['taxableAmount'], 0),
    };
  });

  return {
    supplyType: str(inv['supplyType']) || 'O',
    subSupplyType: str(inv['subSupplyType']) || '1',
    subSupplyDesc: str(inv['subSupplyDesc']).trim(),
    docType: str(inv['docType']) || 'INV',
    docNo: str(inv['docNo']).trim(),
    docDate: normalizeDocDateForApi(inv['docDate']),
    fromGstin: str(inv['fromGstin']).trim().toUpperCase(),
    fromTrdName: str(inv['fromTrdName']).trim(),
    fromAddr1: str(inv['fromAddr1']).trim(),
    fromAddr2: str(inv['fromAddr2']).trim(),
    fromPlace: str(inv['fromPlace']).trim(),
    fromPincode: num(inv['fromPincode'], 0),
    actFromStateCode: fromStateCode,
    fromStateCode,
    toGstin,
    toTrdName: str(inv['toTrdName']).trim(),
    toAddr1: str(inv['toAddr1']).trim(),
    toAddr2: str(inv['toAddr2']).trim(),
    toPlace: str(inv['toPlace']).trim(),
    toPincode: num(inv['toPincode'], 0),
    actToStateCode,
    toStateCode,
    transactionType: num(inv['transactionType'], 1),
    otherValue: '0',
    totalValue,
    cgstValue,
    sgstValue,
    igstValue,
    cessValue,
    cessNonAdvolValue,
    totInvValue,
    transporterId: str(tr['transporterId']).trim(),
    transporterName: str(tr['transporterName']).trim(),
    transDocNo: str(tr['transDocNo']).trim(),
    transMode: str(tr['transMode']) || '1',
    transDistance: String(Math.max(0, Math.round(transDistNum))),
    transDocDate: str(tr['transDocDate']).trim(),
    vehicleNo: str(veh['vehicleNo']).trim().toUpperCase(),
    vehicleType: str(veh['vehicleType']) || 'R',
    itemList,
  };
}

export function splitPersistParts(req: EwbGenerateRequest): EwaybillPersistParts {
  const invoice_details: Record<string, unknown> = {
    supplyType: req.supplyType,
    subSupplyType: req.subSupplyType,
    subSupplyDesc: req.subSupplyDesc,
    docType: req.docType,
    docNo: req.docNo,
    docDate: req.docDate,
    fromGstin: req.fromGstin,
    fromTrdName: req.fromTrdName,
    fromAddr1: req.fromAddr1,
    fromAddr2: req.fromAddr2,
    fromPlace: req.fromPlace,
    fromPincode: req.fromPincode,
    actFromStateCode: req.actFromStateCode,
    fromStateCode: req.fromStateCode,
    toGstin: req.toGstin,
    toTrdName: req.toTrdName,
    toAddr1: req.toAddr1,
    toAddr2: req.toAddr2,
    toPlace: req.toPlace,
    toPincode: req.toPincode,
    actToStateCode: req.actToStateCode,
    toStateCode: req.toStateCode,
    transactionType: req.transactionType,
    otherValue: req.otherValue,
    transDistance: req.transDistance,
    totalValue: req.totalValue,
    cgstValue: req.cgstValue,
    sgstValue: req.sgstValue,
    igstValue: req.igstValue,
    cessValue: req.cessValue,
    cessNonAdvolValue: req.cessNonAdvolValue,
    totInvValue: req.totInvValue,
    itemList: req.itemList,
  };

  return {
    invoice_details,
    transporter_details: {
      transMode: req.transMode,
      transporterId: req.transporterId,
      transporterName: req.transporterName,
      transDocNo: req.transDocNo,
      transDocDate: req.transDocDate,
    },
    vehicle_details: {
      vehicleNo: req.vehicleNo,
      vehicleType: req.vehicleType,
    },
    request: req,
  };
}

/** Parse GSTZen / NIC JSON (several possible success keys). */
export function parseEwbGenerateResponse(
  body: Record<string, unknown>,
): EwbGenerateParsed {
  const ewbNo =
    pickStr(body, ['EwbNo', 'ewbNo', 'ewayBillNo', 'EwbNum']) ||
    pickNestedSigned(body);
  if (ewbNo) {
    const success: EwbGenerateSuccess = {
      ewbNo,
      ewbDate: pickStr(body, ['EwbDt', 'EwbDate', 'ewbDate']),
      validUpto: pickStr(body, ['ValidUpto', 'validUpto']),
      raw: body,
    };
    return success;
  }

  const msg = extractGstZenErrorMessage(body);
  return { message: msg, raw: body };
}

/** Merge top-level GSTZen/NIC fields with common wrapper objects (and JSON string blobs). */
function flattenEwbCancelPayload(raw: Record<string, unknown>): Record<string, unknown> {
  let merged: Record<string, unknown> = { ...raw };
  const unwrapKeys = ['data', 'result', 'response', 'Result'] as const;
  for (const key of unwrapKeys) {
    const v = raw[key];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      merged = { ...merged, ...(v as Record<string, unknown>) };
    } else if (typeof v === 'string') {
      const s = v.trim();
      if (s.startsWith('{')) {
        try {
          const inner = JSON.parse(s) as Record<string, unknown>;
          merged = { ...merged, ...inner };
        } catch {
          /* not JSON — e.g. encrypted NIC payload */
        }
      }
    }
  }
  return merged;
}

function isNicStyleCancelFailure(body: Record<string, unknown>): boolean {
  const st = body['status'];
  return st === '0' || st === 0 || st === 'false';
}

function isNicStyleCancelSuccess(body: Record<string, unknown>): boolean {
  const st = body['status'];
  return st === '1' || st === 1 || st === true;
}

/** Parse GSTZen / NIC cancel JSON. Treats explicit error wrappers as failure. */
export function parseEwbCancelResponse(
  body: Record<string, unknown>,
): EwbCancelParsed {
  const flat = flattenEwbCancelPayload(body);
  const hasErr =
    isNicStyleCancelFailure(flat) ||
    flat['Success'] === 'N' ||
    flat['Success'] === false ||
    (Array.isArray(flat['ErrorDetails']) &&
      (flat['ErrorDetails'] as unknown[]).length > 0);
  if (hasErr) {
    return { message: extractGstZenErrorMessage(flat), raw: body };
  }
  const ewbNo =
    pickStr(flat, ['EwbNo', 'ewbNo', 'ewayBillNo', 'EwbNum']) ||
    pickNestedSigned(flat) ||
    pickStrLoose(flat, ['EwbNo', 'ewbNo', 'ewayBillNo', 'EwbNum']);
  const cancelDate = pickStr(flat, [
    'CancelDate',
    'CancelDt',
    'cancelDate',
    'cancelDt',
    'cnlDt',
    'CnlDt',
  ]);
  if (ewbNo || cancelDate) {
    const success: EwbCancelSuccess = {
      ewbNo: ewbNo ?? '',
      cancelDate,
      raw: body,
    };
    return success;
  }
  if (isNicStyleCancelSuccess(flat)) {
    const success: EwbCancelSuccess = {
      ewbNo: ewbNo ?? '',
      cancelDate,
      raw: body,
    };
    return success;
  }
  return {
    message:
      extractGstZenErrorMessage(flat) ||
      'Unexpected response from GSTZen (cancel).',
    raw: body,
  };
}

/** Parse GSTZen / NIC update-vehicle (Part B) JSON. */
export function parseEwbUpdatePartBResponse(
  body: Record<string, unknown>,
): EwbUpdatePartBParsed {
  const flat = flattenEwbCancelPayload(body);
  const hasErr =
    isNicStyleCancelFailure(flat) ||
    flat['Success'] === 'N' ||
    flat['Success'] === false ||
    (Array.isArray(flat['ErrorDetails']) &&
      (flat['ErrorDetails'] as unknown[]).length > 0);
  if (hasErr) {
    return { message: extractGstZenErrorMessage(flat), raw: body };
  }
  const vehUpdDate = pickStr(flat, [
    'VehUpdDate',
    'vehUpdDate',
    'VehicleUpdDate',
    'vehicleUpdDate',
  ]);
  const ewbNo =
    pickStr(flat, ['EwbNo', 'ewbNo', 'ewayBillNo', 'EwbNum']) ||
    pickNestedSigned(flat) ||
    pickStrLoose(flat, ['EwbNo', 'ewbNo', 'ewayBillNo', 'EwbNum']);
  if (vehUpdDate || ewbNo) {
    const success: EwbUpdatePartBSuccess = {
      ewbNo,
      vehUpdDate,
      raw: body,
    };
    return success;
  }
  if (isNicStyleCancelSuccess(flat)) {
    const success: EwbUpdatePartBSuccess = {
      ewbNo,
      vehUpdDate,
      raw: body,
    };
    return success;
  }
  return {
    message:
      extractGstZenErrorMessage(flat) ||
      'Unexpected response from GSTZen (update Part B).',
    raw: body,
  };
}

/** Parse GSTZen update-transporter JSON (`status`, `ewayBillNo`, `transporterId`, …). */
export function parseEwbUpdateTransporterResponse(
  body: Record<string, unknown>,
): EwbUpdateTransporterParsed {
  const flat = flattenEwbCancelPayload(body);
  const hasErr =
    isNicStyleCancelFailure(flat) ||
    flat['Success'] === 'N' ||
    flat['Success'] === false ||
    (Array.isArray(flat['ErrorDetails']) &&
      (flat['ErrorDetails'] as unknown[]).length > 0);
  if (hasErr) {
    return { message: extractGstZenErrorMessage(flat), raw: body };
  }
  const ewbNo =
    pickStr(flat, ['ewayBillNo', 'EwbNo', 'ewbNo', 'EwbNum']) ||
    pickNestedSigned(flat) ||
    pickStrLoose(flat, ['ewayBillNo', 'EwbNo', 'ewbNo', 'EwbNum']);
  const transporterId = pickStr(flat, ['transporterId', 'TransporterId']);
  const transUpdateDate = pickStr(flat, ['transUpdateDate', 'TransUpdateDate']);
  if (isNicStyleCancelSuccess(flat) || ewbNo || transporterId || transUpdateDate) {
    const success: EwbUpdateTransporterSuccess = {
      ewbNo,
      transporterId,
      transUpdateDate,
      raw: body,
    };
    return success;
  }
  return {
    message:
      extractGstZenErrorMessage(flat) ||
      'Unexpected response from GSTZen (update transporter).',
    raw: body,
  };
}

function pickStrLoose(
  body: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const k of keys) {
    const v = body[k];
    if (typeof v === 'number' && Number.isFinite(v)) {
      return String(v);
    }
  }
  return undefined;
}

function pickNestedSigned(body: Record<string, unknown>): string | null {
  const signed = asRecord(body['SignedEwb']);
  if (signed && typeof signed === 'object') {
    return pickStr(signed as Record<string, unknown>, ['EwbNo', 'ewbNo']) ?? null;
  }
  return null;
}

function extractGstZenErrorMessage(res: Record<string, unknown>): string {
  const fromList =
    Array.isArray(res['ErrorDetails']) &&
    (res['ErrorDetails'] as { error_cd?: string; ErrorMessage?: string }[])
      .map((e) => e.ErrorMessage || e.error_cd)
      .filter(Boolean)
      .join('; ');
  return (
    fromList ||
    (typeof res['message'] === 'string' ? res['message'] : '') ||
    (typeof res['ErrorMessage'] === 'string' ? res['ErrorMessage'] : '') ||
    (res['Success'] === 'N' || res['Success'] === false
      ? 'The GSTZen request was not successful.'
      : 'Unexpected response from GSTZen (no EWB number).')
  );
}

export function sanitizeUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => sanitizeUndefinedDeep(v)) as T;
  }
  if (value && typeof value === 'object') {
    const o = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(o)) {
      if (v === undefined) {
        continue;
      }
      out[k] = sanitizeUndefinedDeep(v);
    }
    return out as T;
  }
  return value;
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}

function str(v: unknown): string {
  return v == null ? '' : String(v);
}

function optStr(v: unknown): string | undefined {
  const s = str(v).trim();
  return s ? s : undefined;
}

function optNum(v: unknown): number | undefined {
  if (v === '' || v == null) {
    return undefined;
  }
  const n = num(v, NaN);
  return Number.isFinite(n) ? n : undefined;
}

function pickStr(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim()) {
      return v.trim();
    }
  }
  return undefined;
}

function defaultItemFromForm(inv: Record<string, unknown>): Record<string, unknown> {
  const tv = num(inv['totalValue'], 0);
  return {
    productName: str(inv['lineProductName']) || 'Goods',
    productDesc: '',
    hsnCode: num(inv['lineHsnCode'], 0),
    quantity: num(inv['lineQuantity'], 1),
    qtyUnit: str(inv['lineQtyUnit']) || 'NOS',
    taxableAmount: num(inv['lineTaxableAmount'], tv),
    igstRate: optNum(inv['lineIgstRate']),
    cgstRate: optNum(inv['lineCgstRate']),
    sgstRate: optNum(inv['lineSgstRate']),
    cessRate: null,
    cessNonAdvol: null,
  };
}

/** Same FY resolution as the home dashboard for `user_dashboard_fy` counts. */
export function readFinancialYearKeyBrowser(): string {
  if (typeof globalThis.sessionStorage === 'undefined') {
    return '2021-2022';
  }
  return (
    globalThis.sessionStorage.getItem('financialYear') ??
    globalThis.localStorage?.getItem('fy') ??
    '2021-2022'
  );
}
