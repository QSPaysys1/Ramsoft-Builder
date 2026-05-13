import type {
  EwbTransporterViewResult,
  EwbTransporterViewRow,
} from '@ramsoft-builder/ewaybills/models/ewb';

const ARRAY_HINT_KEYS = [
  'data',
  'result',
  'list',
  'items',
  'ewbList',
  'ewbDetails',
  'ewayBills',
  'ewayBillList',
  'transporterEwb',
  'transporterEwbList',
  'TransporterEwbList',
  'transporterView',
  'ewbData',
] as const;

/** GSTZen `date` query param: strict `YYYY-MM-DD`. */
export function ewbTransporterViewQueryDateValid(iso: string): boolean {
  const s = iso.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return false;
  }
  const [y, m, d] = s.split('-').map((x) => Number(x));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    return false;
  }
  if (m < 1 || m > 12 || d < 1 || d > 31) {
    return false;
  }
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
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

function pickEwbNoDigits(obj: Record<string, unknown>): string {
  const keys = [
    'ewbNo',
    'ewayBillNo',
    'EwbNo',
    'ewb_number',
    'ewayBillNumber',
    'ewbNum',
    'EwbNum',
    'ewaybillNo',
    'ewayBillNo',
  ];
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'number' && Number.isFinite(v)) {
      const s = String(Math.trunc(v));
      if (s.length === 12) {
        return s;
      }
    }
    if (typeof v === 'string' && v.trim()) {
      const digits = v.replace(/\D/g, '');
      if (digits.length === 12) {
        return digits;
      }
    }
  }
  return '';
}

function firstArrayInRecord(obj: Record<string, unknown>): unknown[] | null {
  for (const k of ARRAY_HINT_KEYS) {
    const v = obj[k];
    if (Array.isArray(v)) {
      return v;
    }
  }
  return null;
}

function collectRowObjects(raw: unknown): unknown[] {
  if (raw == null) {
    return [];
  }
  if (Array.isArray(raw)) {
    return raw;
  }
  if (typeof raw !== 'object') {
    return [];
  }
  const top = raw as Record<string, unknown>;
  const direct = firstArrayInRecord(top);
  if (direct) {
    return direct;
  }
  if (pickEwbNoDigits(top)) {
    return [top];
  }
  const innerKeys = ['result', 'data', 'response', 'Response'] as const;
  for (const ik of innerKeys) {
    const inner = top[ik];
    if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
      const nested = firstArrayInRecord(inner as Record<string, unknown>);
      if (nested) {
        return nested;
      }
      const inRec = inner as Record<string, unknown>;
      if (pickEwbNoDigits(inRec)) {
        return [inRec];
      }
    }
    if (Array.isArray(inner)) {
      return inner;
    }
  }
  return [];
}

function normalizeRow(item: unknown): EwbTransporterViewRow | null {
  const r = asRecord(item);
  if (!Object.keys(r).length) {
    return null;
  }
  const ewbNo = pickEwbNoDigits(r);
  const raw = { ...r };
  return {
    ewbNo,
    ewbDate: pickStr(r, ['ewbDate', 'ewayBillDate', 'EwbDate', 'ewayBillDt']),
    validUpto: pickStr(r, ['validUpto', 'validUptoDate', 'VldUpto', 'ewbValidTill']),
    status: pickStr(r, ['status', 'Status', 'ewbStatus', 'eWayBillStatus']),
    docNo: pickStr(r, ['docNo', 'docNumber', 'DocumentNumber', 'userGstinDocNo']),
    docDate: pickStr(r, ['docDate', 'userDocDate', 'docDt', 'documentDate']),
    fromPlace: pickStr(r, ['fromPlace', 'fromTrdName', 'actFrom']),
    toPlace: pickStr(r, ['toPlace', 'toTrdName', 'actTo']),
    vehicleNo: pickStr(r, ['vehicleNo', 'VehicleNo', 'vehicleNumber']),
    transMode: pickStr(r, ['transMode', 'transactionType', 'TransMode']),
    raw,
  };
}

function pickNotice(obj: Record<string, unknown>): string | undefined {
  const msg =
    pickStr(obj, ['message', 'Message', 'error', 'ErrorMessage', 'remark']) ?? '';
  return msg || undefined;
}

/**
 * Normalizes GSTZen `get-ewb-transporter-view` JSON into tabular rows.
 * Accepts a bare array, a single bill object, or common `{ data: [...] }` envelopes.
 */
export function parseEwbTransporterViewResponse(payload: unknown): EwbTransporterViewResult {
  const rowsIn = collectRowObjects(payload);
  const records: EwbTransporterViewRow[] = [];
  for (const item of rowsIn) {
    const row = normalizeRow(item);
    if (row) {
      records.push(row);
    }
  }
  let notice: string | undefined;
  if (!records.length && payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const top = payload as Record<string, unknown>;
    notice = pickNotice(top);
    const inner = top['result'] ?? top['data'];
    if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
      notice = notice ?? pickNotice(inner as Record<string, unknown>);
    }
  }
  return { records, raw: payload, notice };
}
