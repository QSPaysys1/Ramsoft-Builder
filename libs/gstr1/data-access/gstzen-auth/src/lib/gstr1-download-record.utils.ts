import {
  GSTR1_DOWNLOAD_API_NAMES,
  GSTR1_DOWNLOAD_ROUTE_ONLY_API_NAMES,
  GSTR1A_DOWNLOAD_API_NAMES,
  type Gstr1DownloadAggregateStats,
  type Gstr1DownloadApiName,
  type Gstr1aDownloadApiName,
  type Gstr1DownloadCtinGroup,
  type Gstr1DownloadFlatRow,
  type Gstr1DownloadInvoiceGroup,
  type Gstr1DownloadItemRow,
} from './gstr1-download.models';

export function coerceGstr1DownloadApiName(value: string | null | undefined): Gstr1DownloadApiName {
  const v = (value ?? 'b2b').trim().toLowerCase();
  if ((GSTR1_DOWNLOAD_ROUTE_ONLY_API_NAMES as readonly string[]).includes(v)) {
    return v as Gstr1DownloadApiName;
  }
  return (GSTR1_DOWNLOAD_API_NAMES as readonly string[]).includes(v)
    ? (v as Gstr1DownloadApiName)
    : 'b2b';
}

export function coerceGstr1aDownloadApiName(value: string | null | undefined): Gstr1aDownloadApiName {
  const v = (value ?? 'b2b').trim().toLowerCase();
  return (GSTR1A_DOWNLOAD_API_NAMES as readonly string[]).includes(v)
    ? (v as Gstr1aDownloadApiName)
    : 'b2b';
}

/**
 * Reads `response.message[apiName]` and returns an array (empty if missing).
 * If the bucket is a non-array object, it is wrapped as a single-element array.
 */
export function extractGstr1DownloadMessageArray(
  raw: unknown,
  apiName: Gstr1DownloadApiName | Gstr1aDownloadApiName,
): unknown[] {
  if (apiName === 'doc_issue') {
    return [];
  }
  if (!raw || typeof raw !== 'object') {
    return [];
  }
  const root = raw as Record<string, unknown>;
  const msg = root['message'];
  if (!msg || typeof msg !== 'object') {
    return [];
  }
  const bucket = (msg as Record<string, unknown>)[apiName];
  if (Array.isArray(bucket)) {
    return bucket;
  }
  if (bucket && typeof bucket === 'object') {
    /** HSN summary uses `{ hsn_b2b: [], hsn_b2c: [] }` (or legacy `{ data: [] }`). */
    if (apiName === 'hsnsum') {
      const o = bucket as Record<string, unknown>;
      const merged: unknown[] = [];
      for (const k of ['hsn_b2b', 'hsn_b2c'] as const) {
        const part = o[k];
        if (Array.isArray(part)) {
          merged.push(...part);
        }
      }
      if (merged.length > 0) {
        return merged;
      }
      const legacy = o['data'];
      if (Array.isArray(legacy)) {
        return [...legacy];
      }
      return [];
    }
    return [bucket];
  }
  return [];
}

/**
 * Pulls `sec_sum[]` from a GSTR-1 RETSUM download envelope.
 * Supports `message.data.sec_sum`, nested `message.retsum.sec_sum`, or a single-object `message.retsum` bucket.
 */
export function extractGstr1RetsumSecSum(raw: unknown): unknown[] {
  if (!raw || typeof raw !== 'object') {
    return [];
  }
  const root = raw as Record<string, unknown>;
  const msg = root['message'];
  if (!msg || typeof msg !== 'object') {
    return [];
  }
  const m = msg as Record<string, unknown>;

  const data = m['data'];
  if (data && typeof data === 'object') {
    const sec = (data as Record<string, unknown>)['sec_sum'];
    if (Array.isArray(sec)) {
      return sec;
    }
  }

  const retsumRoot = m['retsum'];
  if (retsumRoot && typeof retsumRoot === 'object') {
    const rs = retsumRoot as Record<string, unknown>;
    if (Array.isArray(rs['sec_sum'])) {
      return rs['sec_sum'];
    }
  }

  const bucket = extractGstr1DownloadMessageArray(raw, 'retsum');
  if (bucket.length > 0 && bucket[0] && typeof bucket[0] === 'object') {
    const inner = bucket[0] as Record<string, unknown>;
    if (Array.isArray(inner['sec_sum'])) {
      return inner['sec_sum'];
    }
  }

  return [];
}

function ttlRecFromSecSumRow(row: Record<string, unknown>): number {
  for (const key of ['ttl_rec', 'ttlRec', 'TTL_REC'] as const) {
    const v = row[key];
    if (typeof v === 'number' && Number.isFinite(v)) {
      return Math.max(0, Math.trunc(v));
    }
    if (typeof v === 'string' && v.trim() !== '') {
      const n = Number.parseInt(v, 10);
      if (Number.isFinite(n)) {
        return Math.max(0, n);
      }
    }
  }
  return 0;
}

/** Normalized RETSUM section key from one `sec_sum` row (string or numeric `sec_nm`). */
export function gstr1RetsumSecNmFromRow(item: unknown): string {
  if (!item || typeof item !== 'object') {
    return '';
  }
  const o = item as Record<string, unknown>;
  const raw = o['sec_nm'] ?? o['secNm'];
  if (typeof raw === 'string') {
    return raw.trim().toUpperCase();
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return String(Math.trunc(raw)).toUpperCase();
  }
  return '';
}

/**
 * True when `secSum` contains at least one row whose `sec_nm` matches an entry in `secNames`.
 * Used to decide whether amendment-specific totals exist vs. falling back to primary tile counts.
 */
export function retsumSecSumHasRowForSecNames(
  secSum: readonly unknown[],
  secNames: readonly string[],
): boolean {
  if (secNames.length === 0) {
    return false;
  }
  const want = new Set(
    secNames
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s.length > 0),
  );
  if (want.size === 0) {
    return false;
  }
  for (const item of secSum) {
    const nm = gstr1RetsumSecNmFromRow(item);
    if (nm && want.has(nm)) {
      return true;
    }
  }
  return false;
}

/**
 * Sums `ttl_rec` for RETSUM rows whose `sec_nm` matches one of `secNames` (case-insensitive).
 * Use this for GSTR-1A / table-9x amendment buckets (e.g. `EXPA`), not the original-return `EXP` row.
 */
export function sumGstr1RetsumTtlRecForSecNames(
  secSum: readonly unknown[],
  secNames: readonly string[],
): number {
  if (secNames.length === 0) {
    return 0;
  }
  const want = new Set(
    secNames
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s.length > 0),
  );
  if (want.size === 0) {
    return 0;
  }
  let sum = 0;
  for (const item of secSum) {
    const nm = gstr1RetsumSecNmFromRow(item);
    if (!nm || !want.has(nm)) {
      continue;
    }
    if (!item || typeof item !== 'object') {
      continue;
    }
    sum += ttlRecFromSecSumRow(item as Record<string, unknown>);
  }
  return sum;
}

/** Maps GSTZen RETSUM `sec_sum` rows to the 13 GSTR-1 workspace portal tiles (B2B… SUPECOM). */
export function mapGstr1RetsumSecSumToPortalTileCounts(secSum: readonly unknown[]): number[] {
  const byName = new Map<string, number>();
  for (const item of secSum) {
    const nm = gstr1RetsumSecNmFromRow(item);
    if (!nm) {
      continue;
    }
    if (!item || typeof item !== 'object') {
      continue;
    }
    const o = item as Record<string, unknown>;
    const prev = byName.get(nm) ?? 0;
    byName.set(nm, prev + ttlRecFromSecSumRow(o));
  }

  const out = Array.from({ length: 13 }, () => 0);
  out[0] = byName.get('B2B') ?? 0;
  out[1] = byName.get('B2CL') ?? 0;
  out[2] = byName.get('EXP') ?? 0;
  out[3] = byName.get('B2CS') ?? 0;
  out[4] = byName.get('NIL') ?? 0;
  out[5] = byName.get('CDNR') ?? 0;
  out[6] = byName.get('CDNUR') ?? 0;
  out[7] = byName.get('AT') ?? 0;
  out[8] = byName.get('TXPD') ?? byName.get('TXP') ?? 0;
  out[9] = byName.get('HSN') ?? 0;
  out[10] = byName.get('DOC_ISSUE') ?? byName.get('DOC_ISSUED') ?? 0;
  out[11] = byName.get('ECOM') ?? 0;
  out[12] = byName.get('SUPECOM') ?? 0;
  return out;
}

function gstDownloadStatusIndicatesSuccess(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object') {
    return false;
  }
  const s = (raw as Record<string, unknown>)['status'];
  return s === 1 || s === '1';
}

export function isGstr1DownloadSuccessEnvelope(
  raw: unknown,
): raw is { readonly status: number | string; readonly message: Record<string, unknown> } {
  return (
    !!raw &&
    typeof raw === 'object' &&
    gstDownloadStatusIndicatesSuccess(raw) &&
    typeof (raw as Record<string, unknown>)['message'] === 'object' &&
    (raw as Record<string, unknown>)['message'] !== null
  );
}

function num(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) {
    return v;
  }
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/** Keys commonly used across GSTR JSON for taxable value (`txval`) and synonyms. */
const TXVAL_KEYS = [
  'txval',
  'Txval',
  'TXVAL',
  'taxable_val',
  'taxval',
  'tx_vl',
  'tov',
] as const;

const IAMT_KEYS = ['iamt', 'Iamt', 'IAMT', 'IGST'] as const;
const CAMT_KEYS = ['camt', 'Camt', 'CAMT'] as const;
const SAMT_KEYS = ['samt', 'Samt', 'SAMT'] as const;
const CSAMT_KEYS = ['csamt', 'Csamt', 'CSAMT'] as const;

/** First layer that declares one of `keys`, in order — preserves numeric `0` when the key exists. */
function firstDefinedNumeric(
  layers: ReadonlyArray<Record<string, unknown> | undefined>,
  keys: readonly string[],
): number | undefined {
  for (const layer of layers) {
    if (!layer || typeof layer !== 'object') {
      continue;
    }
    for (const k of keys) {
      if (
        Object.prototype.hasOwnProperty.call(layer, k) &&
        layer[k] !== undefined &&
        layer[k] !== null &&
        !(typeof layer[k] === 'string' && (layer[k] as string).trim() === '')
      ) {
        return num(layer[k]);
      }
    }
  }
  return undefined;
}

/**
 * Merges GST line tax fields from layered objects (typically `itm_det` plus parent item).
 * Prefers canonical `txval` / `iamt` naming but accepts portal variants.
 */
export function mergeGstrTaxLineFields(
  ...layers: Array<Record<string, unknown> | undefined>
): Omit<Gstr1DownloadItemRow, 'lineLabel'> {
  const layerArr = [...layers];
  return {
    taxableValue: firstDefinedNumeric(layerArr, [...TXVAL_KEYS]) ?? 0,
    igst: firstDefinedNumeric(layerArr, [...IAMT_KEYS]) ?? 0,
    cgst: firstDefinedNumeric(layerArr, [...CAMT_KEYS]) ?? 0,
    sgst: firstDefinedNumeric(layerArr, [...SAMT_KEYS]) ?? 0,
    cess: firstDefinedNumeric(layerArr, [...CSAMT_KEYS]) ?? 0,
  };
}

function pickStr(o: Record<string, unknown>, keys: readonly string[]): string {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'string') {
      return v;
    }
    if (typeof v === 'number' && Number.isFinite(v)) {
      return String(v);
    }
    if (typeof v === 'boolean') {
      return v ? 'Y' : 'N';
    }
  }
  return '';
}

function itemFromUnknown(it: unknown): Gstr1DownloadItemRow | null {
  if (!it || typeof it !== 'object') {
    return null;
  }
  const o = it as Record<string, unknown>;
  const detSrc = o['itm_det'];
  const det =
    detSrc && typeof detSrc === 'object' ? (detSrc as Record<string, unknown>) : undefined;
  const n = pickStr(o, ['num', 'line_num', 'lineno']);
  const merged = mergeGstrTaxLineFields(det, o);
  return {
    lineLabel: n ? `Line ${n}` : 'Line',
    ...merged,
  };
}

function invoiceLineCandidates(invObj: Record<string, unknown>): unknown[] {
  const candidates = ['itms', 'items', 'item', 'det'] as const;
  for (const k of candidates) {
    const v = invObj[k];
    if (Array.isArray(v)) {
      return v;
    }
  }
  return [];
}

function itemsFromInvoice(invObj: Record<string, unknown>): Gstr1DownloadItemRow[] {
  const itms = invoiceLineCandidates(invObj);
  if (itms.length > 0) {
    const out: Gstr1DownloadItemRow[] = [];
    for (const it of itms) {
      const row = itemFromUnknown(it);
      if (row) {
        out.push(row);
      }
    }
    return out.length > 0 ? out : fallbackItemsFromInvoiceTotals(invObj);
  }
  return fallbackItemsFromInvoiceTotals(invObj);
}

function fallbackItemsFromInvoiceTotals(invObj: Record<string, unknown>): Gstr1DownloadItemRow[] {
  return [
    {
      lineLabel: 'Record totals',
      ...mergeGstrTaxLineFields(invObj),
    },
  ];
}

function deriveInvoiceFaceValue(invObj: Record<string, unknown>, lines: readonly Gstr1DownloadItemRow[]): number | null {
  const declared = firstDefinedNumeric([invObj], ['val', 'tval', 'totval', 'ttl']);
  if (declared !== undefined) {
    return declared;
  }
  if (lines.length === 0) {
    return null;
  }
  const sumAgg = lines.reduce(
    (a, ln) =>
      a + ln.taxableValue + ln.igst + ln.cgst + ln.sgst + ln.cess,
    0,
  );
  return sumAgg !== 0 ? sumAgg : null;
}

function invoiceFromUnknown(inv: unknown, ctinFallback: string): Gstr1DownloadInvoiceGroup | null {
  if (!inv || typeof inv !== 'object') {
    return null;
  }
  const invObj = inv as Record<string, unknown>;
  const inum = pickStr(invObj, ['inum', 'INUM']);
  const idt = pickStr(invObj, ['idt']);
  const invoiceNo = inum || pickStr(invObj, ['doc_num', 'docnum', 'nt_num', 'ntnum']) || '—';
  const invoiceDate =
    idt || pickStr(invObj, ['doc_dt', 'docdt', 'nt_dt', 'ntdt']) || '—';
  const invoiceKey = `${ctinFallback}|${invoiceNo}|${invoiceDate}`;
  const items = itemsFromInvoice(invObj);
  return {
    invoiceKey,
    invoiceNo,
    invoiceDate,
    invoiceValue: deriveInvoiceFaceValue(invObj, items),
    pos: pickStr(invObj, ['pos']),
    reverseCharge: pickStr(invObj, ['rchrg', 'rev']),
    irn: pickStr(invObj, ['irn']),
    items,
  };
}

function invoicesFromBucket(bucket: Record<string, unknown>, ctin: string): Gstr1DownloadInvoiceGroup[] {
  const invRaw = bucket['inv'];
  if (!Array.isArray(invRaw)) {
    const single = invoiceFromUnknown(bucket, ctin);
    return single ? [single] : [];
  }
  const list: Gstr1DownloadInvoiceGroup[] = [];
  for (const inv of invRaw) {
    const row = invoiceFromUnknown(inv, ctin);
    if (row) {
      list.push(row);
    }
  }
  return list;
}

function ctinFromBucket(bucket: Record<string, unknown>): string {
  return pickStr(bucket, ['ctin', 'CTIN']).trim().toUpperCase();
}

/** Attempts GST portal–style `ctin` + `inv[]` grouping; falls back to treating each record as an invoice. */
export function parseGstr1DownloadHierarchy(records: unknown[]): Gstr1DownloadCtinGroup[] {
  const map = new Map<string, Gstr1DownloadInvoiceGroup[]>();

  const pushInvoices = (ctin: string, invoices: Gstr1DownloadInvoiceGroup[]) => {
    const key = ctin || '—';
    const cur = map.get(key) ?? [];
    map.set(key, cur.concat(invoices));
  };

  for (const rec of records) {
    if (!rec || typeof rec !== 'object') {
      continue;
    }
    const bucket = rec as Record<string, unknown>;
    const ctin = ctinFromBucket(bucket);
    const ctinKey = ctin || '—';

    if (Array.isArray(bucket['inv'])) {
      const invs = invoicesFromBucket(bucket, ctinKey);
      if (invs.length > 0) {
        pushInvoices(ctinKey, invs);
      } else {
        const fallback = invoiceFromUnknown(bucket, ctinKey);
        pushInvoices(ctinKey, fallback ? [fallback] : []);
      }
      continue;
    }

    const row = invoiceFromUnknown(bucket, ctinKey);
    if (row) {
      pushInvoices(ctinKey, [row]);
    }
  }

  return [...map.entries()].map(([ctin, invoices]) => ({
    ctin,
    invoices,
  }));
}

export function flattenGstr1DownloadHierarchy(groups: readonly Gstr1DownloadCtinGroup[]): Gstr1DownloadFlatRow[] {
  const rows: Gstr1DownloadFlatRow[] = [];
  for (const g of groups) {
    for (const inv of g.invoices) {
      for (const line of inv.items) {
        rows.push({
          ctin: g.ctin,
          invoiceNo: inv.invoiceNo,
          invoiceDate: inv.invoiceDate,
          invoiceValue: inv.invoiceValue,
          pos: inv.pos,
          reverseCharge: inv.reverseCharge,
          irn: inv.irn,
          taxableValue: line.taxableValue,
          igst: line.igst,
          cgst: line.cgst,
          sgst: line.sgst,
          cess: line.cess,
          lineLabel: line.lineLabel,
        });
      }
    }
  }
  return rows;
}

export function aggregateGstr1DownloadRows(
  flat: readonly Gstr1DownloadFlatRow[],
  sourceBucketLength: number,
): Gstr1DownloadAggregateStats {
  let invoiceCount = 0;
  const invoiceKeys = new Set<string>();
  const ctins = new Set<string>();
  let taxableTotal = 0;
  let igstTotal = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let cessTotal = 0;

  for (const r of flat) {
    invoiceKeys.add(`${r.ctin}|${r.invoiceNo}|${r.invoiceDate}`);
    if (r.ctin && r.ctin !== '—') {
      ctins.add(r.ctin);
    }
    taxableTotal += r.taxableValue;
    igstTotal += r.igst;
    cgstTotal += r.cgst;
    sgstTotal += r.sgst;
    cessTotal += r.cess;
  }
  invoiceCount = invoiceKeys.size;

  return {
    sourceBucketLength,
    totalLineItems: flat.length,
    invoiceCount,
    ctinCount: ctins.size,
    taxableTotal,
    igstTotal,
    cgstTotal,
    sgstTotal,
    cessTotal,
    taxGrandTotal: igstTotal + cgstTotal + sgstTotal + cessTotal,
  };
}

function includesQuery(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.trim().toLowerCase());
}

export function filterGstr1DownloadHierarchy(
  groups: readonly Gstr1DownloadCtinGroup[],
  query: string,
): Gstr1DownloadCtinGroup[] {
  const q = query.trim();
  if (!q) {
    return [...groups];
  }
  const out: Gstr1DownloadCtinGroup[] = [];
  for (const g of groups) {
    if (includesQuery(g.ctin, q)) {
      out.push(g);
      continue;
    }
    const invs: Gstr1DownloadInvoiceGroup[] = [];
    for (const inv of g.invoices) {
      const invMatch =
        includesQuery(inv.invoiceNo, q) ||
        includesQuery(inv.invoiceDate, q) ||
        includesQuery(inv.pos, q) ||
        includesQuery(inv.irn, q) ||
        includesQuery(inv.reverseCharge, q);
      if (invMatch) {
        invs.push(inv);
        continue;
      }
      const itemMatch = inv.items.some(
        (it) =>
          includesQuery(it.lineLabel, q) ||
          String(it.taxableValue).includes(q) ||
          String(it.igst + it.cgst + it.sgst + it.cess).includes(q),
      );
      if (itemMatch) {
        invs.push(inv);
      }
    }
    if (invs.length > 0) {
      out.push({ ctin: g.ctin, invoices: invs });
    }
  }
  return out;
}
