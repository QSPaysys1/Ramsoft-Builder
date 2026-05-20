import type { Gstr2aB2baSupplierRow } from './gstr2-b2ba.models';

function asRecord(v: unknown): Record<string, unknown> | undefined {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : undefined;
}

function str(v: unknown): string {
  if (v === null || v === undefined) {
    return '';
  }
  if (typeof v === 'string') {
    return v.trim();
  }
  if (typeof v === 'number' || typeof v === 'boolean') {
    return String(v);
  }
  return '';
}

function pickField(row: Record<string, unknown>, keys: readonly string[]): string {
  for (const k of keys) {
    const v = row[k];
    const s = str(v);
    if (s) {
      return s;
    }
  }
  return '';
}

function gstr2StatusIndicatesSuccess(raw: unknown): boolean {
  const r = asRecord(raw);
  if (!r) {
    return false;
  }
  const s = r['status'];
  return s === 1 || s === '1' || s === 200 || s === '200';
}

function extractB2baArrayFromMessage(msg: Record<string, unknown>): unknown[] {
  const direct = msg['b2ba'];
  if (Array.isArray(direct)) {
    return direct;
  }
  if (direct && typeof direct === 'object' && !Array.isArray(direct)) {
    const inner = direct as Record<string, unknown>;
    for (const k of ['data', 'suppliers', 'summary', 'list'] as const) {
      const v = inner[k];
      if (Array.isArray(v)) {
        return v;
      }
    }
    return [direct];
  }
  const data = msg['data'];
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    const nested = d['b2ba'];
    if (Array.isArray(nested)) {
      return nested;
    }
  }
  return [];
}

function extractB2baRawArray(payload: unknown): unknown[] {
  const root = asRecord(payload);
  if (!root) {
    return [];
  }
  const msg = asRecord(root['message']);
  if (msg) {
    const fromMsg = extractB2baArrayFromMessage(msg);
    if (fromMsg.length > 0) {
      return fromMsg;
    }
  }
  for (const k of ['b2ba', 'B2BA', 'data', 'Data'] as const) {
    const v = root[k];
    if (Array.isArray(v)) {
      return v;
    }
  }
  return [];
}

function mapSupplierRow(raw: Record<string, unknown>): Gstr2aB2baSupplierRow {
  return {
    supplierGstin: pickField(raw, [
      'ctin',
      'CTIN',
      'gstin',
      'GSTIN',
      'supplier_gstin',
      'sup_gstin',
    ]).toUpperCase(),
    supplierName: pickField(raw, [
      'cname',
      'trade_name',
      'trdnm',
      'lgnm',
      'legal_name',
      'supplier_name',
      'name',
      'Name',
    ]),
    gstr1FilingStatus: pickField(raw, [
      'cfs',
      'CFS',
      'filing_status',
      'gstr1_filing_status',
      'status',
      'gstr1_status',
    ]),
    gstr1FilingDate: pickField(raw, [
      'fldtr1',
      'dof',
      'filing_date',
      'gstr1_filing_date',
      'date_of_filing',
      'flprdr1_dt',
    ]),
    gstr1FilingPeriod: pickField(raw, [
      'flprdr1',
      'ret_prd',
      'retprd',
      'filing_period',
      'gstr1_filing_period',
    ]),
    gstr3bFilingStatus: pickField(raw, [
      'cfs3b',
      'CFS3B',
      'gstr3b_filing_status',
      'gstr3b_status',
      'status3b',
    ]),
    cancellationDate: pickField(raw, [
      'cxdt',
      'dt_canc',
      'cancel_date',
      'cancellation_date',
      'effective_date_of_cancellation',
    ]),
  };
}

/**
 * Normalizes GSTZen `POST gstr2/b2ba/` into supplier-level rows (one per CTIN when nested).
 */
export function parseGstr2B2baSuppliersFromPayload(
  payload: unknown,
): Gstr2aB2baSupplierRow[] {
  const raw = extractB2baRawArray(payload);
  const byGstin = new Map<string, Gstr2aB2baSupplierRow>();

  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      continue;
    }
    const rec = item as Record<string, unknown>;
    const ctin = pickField(rec, ['ctin', 'CTIN', 'gstin', 'GSTIN']).toUpperCase();
    if (ctin.length === 15) {
      const mapped = mapSupplierRow(rec);
      if (!byGstin.has(ctin) || mapped.supplierName) {
        byGstin.set(ctin, mapped);
      }
      continue;
    }
    const inv = rec['inv'] ?? rec['invoice'] ?? rec['invoices'];
    if (Array.isArray(inv) && inv.length > 0) {
      const parentCtin =
        pickField(rec, ['ctin', 'CTIN']).toUpperCase() ||
        pickField((inv[0] as Record<string, unknown>) ?? {}, ['ctin', 'CTIN']).toUpperCase();
      if (parentCtin.length === 15) {
        const mapped = mapSupplierRow({
          ...rec,
          ctin: parentCtin,
        });
        if (!byGstin.has(parentCtin) || mapped.supplierName) {
          byGstin.set(parentCtin, mapped);
        }
      }
      continue;
    }
    const mapped = mapSupplierRow(rec);
    if (mapped.supplierGstin) {
      byGstin.set(mapped.supplierGstin, mapped);
    }
  }

  return [...byGstin.values()].sort((a, b) =>
    a.supplierGstin.localeCompare(b.supplierGstin),
  );
}

export function isGstr2B2baSuccessEnvelope(
  raw: unknown,
): raw is { readonly message: Record<string, unknown> } {
  return (
    !!raw &&
    typeof raw === 'object' &&
    gstr2StatusIndicatesSuccess(raw) &&
    typeof (raw as Record<string, unknown>)['message'] === 'object' &&
    (raw as Record<string, unknown>)['message'] !== null
  );
}

export function gstr2B2baLogicalError(payload: unknown): string | null {
  if (isGstr2B2baSuccessEnvelope(payload)) {
    return null;
  }
  const r = asRecord(payload);
  if (!r) {
    return 'Unexpected response from GSTR-2 B2BA API.';
  }
  const err =
    r['error'] ??
    r['Error'] ??
    r['detail'] ??
    (asRecord(r['message'])?.['error'] ?? asRecord(r['message'])?.['Error']);
  if (typeof err === 'string' && err.trim()) {
    return err.trim();
  }
  if (!gstr2StatusIndicatesSuccess(payload)) {
    return 'GSTR-2 B2BA request did not return a success status.';
  }
  return null;
}

export interface Gstr2aB2baCsvColumn {
  readonly label: string;
  readonly field: keyof Gstr2aB2baSupplierRow;
}

const GSTR2A_B2BA_CSV_COLUMNS: readonly Gstr2aB2baCsvColumn[] = [
  { label: 'GSTIN of Supplier', field: 'supplierGstin' },
  { label: 'Supplier Name', field: 'supplierName' },
  {
    label: 'GSTR-1/IFF/GSTR-1A/GSTR-5 Filing Status',
    field: 'gstr1FilingStatus',
  },
  {
    label: 'GSTR-1/IFF/GSTR-1A/GSTR-5 Filing Date',
    field: 'gstr1FilingDate',
  },
  {
    label: 'GSTR-1/IFF/GSTR-1A/GSTR-5 Filing Period',
    field: 'gstr1FilingPeriod',
  },
  { label: 'GSTR-3B filing status', field: 'gstr3bFilingStatus' },
  { label: 'Effective date of cancellation', field: 'cancellationDate' },
];

export function gstr2aB2baRowsToCsv(
  rows: readonly Gstr2aB2baSupplierRow[],
  columns: readonly Gstr2aB2baCsvColumn[] = GSTR2A_B2BA_CSV_COLUMNS,
): string {
  const escape = (cell: string): string => {
    const s = cell.replace(/"/g, '""');
    return /[",\n\r]/.test(s) ? `"${s}"` : s;
  };
  const lines = [
    columns.map((c) => escape(c.label)).join(','),
    ...rows.map((r) =>
      columns.map((c) => escape(String(r[c.field] ?? ''))).join(','),
    ),
  ];
  return lines.join('\n');
}
