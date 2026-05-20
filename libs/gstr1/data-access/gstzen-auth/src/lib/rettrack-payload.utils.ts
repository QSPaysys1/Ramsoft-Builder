/**
 * Pure helpers for GSTZen Rettrack (`POST rettrack/`) responses — shared by UI surfaces that parse `EFiledlist`.
 */

export const RETURN_PERIOD_REGEX = /^(0[1-9]|1[0-2])\d{4}$/;
/** Empty or valid GST `MMYYYY` so forms stay valid when optional. */
export const OPTIONAL_RET_PERIOD_REGEX = /^(?:|(0[1-9]|1[0-2])\d{4})$/;

export const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/** Overall filing signal for one return family in a period (derived from dynamic API fields). */
export type MonthReturnKind = 'filed' | 'notFiled' | 'pending' | 'error' | 'idle';

export function asRecord(v: unknown): Record<string, unknown> | undefined {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : undefined;
}

const EFILED_LIST_KEYS = [
  'EFiledlist',
  'efiledlist',
  'E_FILED_LIST',
  'efiledList',
  'EFILED_LIST',
] as const;

function eFiledArrayFromRecord(rec: Record<string, unknown>): unknown[] | null {
  for (const k of EFILED_LIST_KEYS) {
    const v = rec[k];
    if (Array.isArray(v)) {
      return v;
    }
  }
  return null;
}

function unwrapNestedRecord(value: unknown): Record<string, unknown> | undefined {
  let v: unknown = value;
  if (typeof v === 'string') {
    const t = v.trim();
    if (t.startsWith('{') || t.startsWith('[')) {
      try {
        v = JSON.parse(t) as unknown;
      } catch {
        return undefined;
      }
    } else {
      return undefined;
    }
  }
  return asRecord(v);
}

export function filedListFromPayload(payload: unknown): Record<string, unknown>[] {
  const r = asRecord(payload);
  if (!r) {
    return [];
  }
  let raw = eFiledArrayFromRecord(r);
  if (raw === null) {
    const nestKeys = [
      'message',
      'Message',
      'data',
      'Data',
      'result',
      'Result',
      'response',
      'Response',
      'payload',
      'Payload',
    ] as const;
    for (const nk of nestKeys) {
      const innerRec = unwrapNestedRecord(r[nk]) ?? asRecord(r[nk]);
      if (!innerRec) {
        continue;
      }
      raw = eFiledArrayFromRecord(innerRec);
      if (raw !== null) {
        break;
      }
    }
  }
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter(
    (row): row is Record<string, unknown> =>
      !!row && typeof row === 'object' && !Array.isArray(row),
  );
}

export function cellStr(v: unknown): string {
  if (v === null || v === undefined) {
    return '—';
  }
  if (
    typeof v === 'string' ||
    typeof v === 'number' ||
    typeof v === 'boolean'
  ) {
    return String(v);
  }
  return '—';
}

/** Five calendar months ending with the current month (inclusive), oldest column first — e.g. in Apr 2026 the newest column is Apr 2026 (`042026`). */
export function lastFiveGstReturnPeriodLabels(
  now = new Date(),
): { readonly label: string; readonly retPeriod: string }[] {
  const out: { label: string; retPeriod: string }[] = [];
  for (let k = 4; k >= 0; k--) {
    const d = new Date(now.getFullYear(), now.getMonth() - k, 1);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = String(d.getFullYear());
    const retPeriod = `${mm}${yyyy}`;
    const label = `${MONTH_SHORT[d.getMonth()]} – ${yyyy}`;
    out.push({ label, retPeriod });
  }
  return out;
}

export function normalizeGstPeriodToMmYyyy(raw: unknown): string | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  const s0 = String(raw).trim();
  if (!s0) {
    return null;
  }
  const s = s0.replace(/\s+/g, '');
  if (RETURN_PERIOD_REGEX.test(s)) {
    return s;
  }
  const yyyyMm = /^((?:19|20)\d{2})(0[1-9]|1[0-2])$/;
  const ym = yyyyMm.exec(s);
  if (ym) {
    const yyyy = ym[1];
    const mm = ym[2];
    return `${mm}${yyyy}`;
  }
  const mmYyyySlash = /^([0-9]{1,2})[/-]((?:19|20)\d{2})$/;
  const m = mmYyyySlash.exec(s);
  if (m) {
    const mm = m[1].padStart(2, '0');
    const yyyy = m[2];
    if (/^(0[1-9]|1[0-2])$/.test(mm)) {
      return `${mm}${yyyy}`;
    }
  }
  return null;
}

const ROW_PERIOD_KEYS = [
  'ret_prd',
  'retprd',
  'ret_period',
  'retPeriod',
  'RetPrd',
  'retPrd',
  'RET_PRD',
  'tax_period',
  'taxprd',
  'TaxPrd',
] as const;

const ROW_GSTIN_KEYS = ['gstin', 'GSTIN', 'Gstin', 'ctin', 'CTIN', 'd_gst'] as const;

/** Only rows for this calendar column: GSTIN on the row must match when present; return month on the row must match when present (else we trust the scoped API response). */
export function rowMatchesCalendarColumn(
  row: Record<string, unknown>,
  columnMmYyyy: string,
  requestGstinUpper: string,
): boolean {
  for (const k of ROW_GSTIN_KEYS) {
    const v = row[k];
    if (typeof v === 'string' && v.trim()) {
      if (v.trim().toUpperCase() !== requestGstinUpper) {
        return false;
      }
    }
  }
  const periods: string[] = [];
  for (const k of ROW_PERIOD_KEYS) {
    const n = normalizeGstPeriodToMmYyyy(row[k]);
    if (n !== null) {
      periods.push(n);
    }
  }
  if (periods.length > 0) {
    return periods.includes(columnMmYyyy);
  }
  return true;
}

export function normalizeRtnType(row: Record<string, unknown>): string {
  const t =
    row['rtntype'] ??
    row['rtn_type'] ??
    row['Rtn_Type'] ??
    row['Rtntype'] ??
    row['return_type'] ??
    row['ReturnType'];
  return String(t ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '');
}

export function isGstr1IffFamily(t: string): boolean {
  return (
    t.includes('GSTR1') ||
    t.includes('GSTR-1') ||
    t === 'IFF' ||
    t.includes('IFF')
  );
}

export function isGstr3bFamily(t: string): boolean {
  return t.includes('GSTR3B') || t.includes('GSTR-3B') || /\b3B\b/.test(t);
}

/** GSTR-1A / amendment outward — normalized type string. */
export function isGstr1aFamily(t: string): boolean {
  return (
    t.includes('GSTR1A') ||
    t.includes('GSTR1_A') ||
    /\b1A\b/.test(t) ||
    (t.includes('GSTR1') && /AMEND|AMD|1A/i.test(t))
  );
}

/** GSTR-2A auto drafted (view). */
export function isGstr2aFamily(t: string): boolean {
  if (t.includes('GSTR2B')) {
    return false;
  }
  return t.includes('GSTR2A') || /\b2A\b/.test(t);
}

/** GSTR-2B ITC statement. */
export function isGstr2bFamily(t: string): boolean {
  return t.includes('GSTR2B') || /\b2B\b/.test(t);
}

/**
 * Primary GSTR-1 / IFF row — excludes GSTR-1A which normalizes to GSTR1A… and would match `GSTR1`.
 */
export function isGstr1IffFamilyExclusive(t: string): boolean {
  if (isGstr1aFamily(t) || isGstr2aFamily(t) || isGstr2bFamily(t) || isGstr3bFamily(t)) {
    return false;
  }
  return (
    t.includes('GSTR1') ||
    t === 'IFF' ||
    t.includes('IFF')
  );
}

function collectStatusLikeText(row: Record<string, unknown>): string {
  const parts: string[] = [];
  const directKeys = ['status', '_Status', 'Status', 'STATUS', 'stts', 'Stts'];
  for (const k of directKeys) {
    const v = row[k];
    if (typeof v === 'string' && v.trim()) {
      parts.push(v.trim());
    }
  }
  for (const [k, v] of Object.entries(row)) {
    if (directKeys.includes(k)) {
      continue;
    }
    if (!/(status|stts|remark|desc|msg|message|error|reason)/i.test(k)) {
      continue;
    }
    if (typeof v === 'string' && v.trim()) {
      parts.push(v.trim());
    }
  }
  return parts.join(' ').toUpperCase();
}

function rowLooksExplicitError(row: Record<string, unknown>): boolean {
  const blob = `${collectStatusLikeText(row)} ${JSON.stringify(row).toUpperCase()}`;
  if (/\berror\b|\bfail\b|\binvalid\b|\breject\b|\bduplicate\b/i.test(blob)) {
    return true;
  }
  const e =
    row['error'] ??
    row['Error'] ??
    row['fault'] ??
    row['faultstring'] ??
    row['faultString'];
  if (typeof e === 'string' && e.trim()) {
    return true;
  }
  return false;
}

function rowLooksPending(row: Record<string, unknown>): boolean {
  const u = collectStatusLikeText(row);
  return (
    u.includes('PENDING') ||
    u.includes('TO BE FILE') ||
    u.includes('TO BE FILED') ||
    u.includes('PROVISIONAL') ||
    u.includes('DRAFT')
  );
}

function rowLooksNotFiled(row: Record<string, unknown>): boolean {
  const u = collectStatusLikeText(row).replace(/\s+/g, ' ');
  if (u.includes('NOT FILED') || u.includes('NOTFILED')) {
    return true;
  }
  if (
    /\bNIL\b|\bNO\s*RECORD\b|\bNO\s*DATA\b|\bUNFILED\b/i.test(collectStatusLikeText(row))
  ) {
    return true;
  }
  return false;
}

/** ARN or date-of-filing on a Rettrack row — strong filed signal. */
export function rowHasFilingEvidence(
  row: Record<string, unknown> | undefined,
): boolean {
  if (!row) {
    return false;
  }
  if (rowArn(row).length >= 4) {
    return true;
  }
  const dof = rowFilingDateLabel(row);
  if (dof.length >= 6 && dof !== '—') {
    return true;
  }
  return false;
}

function rowLooksFiled(row: Record<string, unknown>): boolean {
  const u = collectStatusLikeText(row);
  if (u.includes('NOT FILED') || u.includes('NOTFILED')) {
    return false;
  }
  if (rowHasFilingEvidence(row)) {
    return true;
  }
  const status = String(row['status'] ?? row['_Status'] ?? '')
    .trim()
    .toUpperCase();
  if (status.includes('FILED') || u.includes('FILED')) {
    return true;
  }
  if (
    status.includes('ACCEPT') ||
    status.includes('PROCEED') ||
    status.includes('SUBMIT') ||
    status.includes('SUCCESS') ||
    status.includes('COMPLET')
  ) {
    return true;
  }
  if (
    /\bE-?FILED\b|\bEFILED\b|\bFILED\s+SUCCESS/i.test(u)
  ) {
    return true;
  }
  const v = String(row['valid'] ?? row['Validity'] ?? '')
    .trim()
    .toUpperCase();
  if (v === 'Y' || v === 'YES') {
    return true;
  }
  const arn = String(row['arn'] ?? row['ARN'] ?? '').trim();
  if (arn.length >= 4) {
    return true;
  }
  return false;
}

/** Inspect top-level JSON for gateway / portal fault patterns (dynamic keys). */
export function topLevelPayloadError(payload: unknown): string | null {
  const r = asRecord(payload);
  if (!r) {
    return null;
  }
  for (const k of Object.keys(r)) {
    if (!/^(error|Error|fault|Fault|faultstring|faultString|exception|detail)$/i.exec(k)) {
      continue;
    }
    const v = r[k];
    if (typeof v === 'string' && v.trim()) {
      return v.trim();
    }
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const rr = asRecord(v);
      const inner =
        rr?.['message'] ?? rr?.['Message'] ?? rr?.['faultstring'];
      if (typeof inner === 'string' && inner.trim()) {
        return inner.trim();
      }
    }
  }
  return null;
}

export function deriveFamilyStatus(
  rows: Record<string, unknown>[],
  columnMmYyyy: string,
  requestGstinUpper: string,
  match: (t: string) => boolean,
): Exclude<MonthReturnKind, 'idle'> {
  const subset = rows.filter(
    (row) =>
      rowMatchesCalendarColumn(row, columnMmYyyy, requestGstinUpper) &&
      match(normalizeRtnType(row)),
  );
  if (subset.some((row) => rowLooksExplicitError(row))) {
    return 'error';
  }
  if (subset.length === 0) {
    return 'notFiled';
  }
  if (subset.some((row) => rowLooksFiled(row))) {
    return 'filed';
  }
  if (subset.some((row) => rowLooksPending(row))) {
    return 'pending';
  }
  if (subset.some((row) => rowLooksNotFiled(row))) {
    return 'notFiled';
  }
  // Rows in EFiledlist for this return family and period are e-filed unless marked otherwise.
  return 'filed';
}

export function rettrackCacheKey(gstin: string, retPeriod: string): string {
  return `efd-v2::${gstin.trim().toUpperCase()}::${retPeriod}`;
}

const ARN_KEYS = ['arn', 'ARN', 'Arn', 'ackNo', 'ack_no', 'AckNo'] as const;
const DATE_KEYS = [
  'dof',
  'dateoffiling',
  'date_of_filing',
  'dofiling',
  'filingDate',
  'FilingDate',
  'file_date',
] as const;

/** Best display row for a return family (prefer filed / ARN). */
export function pickRepresentativeRow(
  rows: Record<string, unknown>[],
  columnMmYyyy: string,
  requestGstinUpper: string,
  match: (t: string) => boolean,
): Record<string, unknown> | undefined {
  const subset = rows.filter(
    (row) =>
      rowMatchesCalendarColumn(row, columnMmYyyy, requestGstinUpper) &&
      match(normalizeRtnType(row)),
  );
  if (subset.length === 0) {
    return undefined;
  }
  const filed = subset.find((r) => rowLooksFiled(r) && !rowLooksExplicitError(r));
  if (filed) {
    return filed;
  }
  const withEvidence = subset.find(
    (r) => rowHasFilingEvidence(r) && !rowLooksExplicitError(r),
  );
  if (withEvidence) {
    return withEvidence;
  }
  return subset[0];
}

export function rowArn(row: Record<string, unknown> | undefined): string {
  if (!row) {
    return '';
  }
  for (const k of ARN_KEYS) {
    const v = row[k];
    if (typeof v === 'string' && v.trim()) {
      return v.trim();
    }
  }
  return '';
}

export function rowFilingDateLabel(row: Record<string, unknown> | undefined): string {
  if (!row) {
    return '';
  }
  for (const k of DATE_KEYS) {
    const v = row[k];
    if (typeof v === 'string' && v.trim()) {
      return v.trim();
    }
    if (typeof v === 'number' && Number.isFinite(v)) {
      return String(v);
    }
  }
  return '';
}

export function cellFromRow(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    if (
      k in row &&
      row[k] !== undefined &&
      row[k] !== null &&
      row[k] !== ''
    ) {
      return cellStr(row[k]);
    }
  }
  return '—';
}
