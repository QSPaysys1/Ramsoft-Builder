import type { Gstr2aCdnaSupplierSummary } from './gstr2-cdna.models';
import {
  gstr2AsRecord,
  gstr2LogicalError,
  gstr2PickField,
  gstr2Str,
} from './gstr2-response.utils';

interface CdnaNoteStub {
  readonly supplierGstin: string;
  readonly supplierName: string;
  readonly noteNumber: string;
  readonly gstr1FilingStatus: string;
  readonly gstr1FilingDate: string;
  readonly gstr1FilingPeriod: string;
  readonly gstr3bFilingStatus: string;
  readonly cancellationDate: string;
}

function extractCdnaArrayFromMessage(msg: Record<string, unknown>): unknown[] {
  const direct = msg['cdna'] ?? msg['cdnra'];
  if (Array.isArray(direct)) {
    return direct;
  }
  if (direct && typeof direct === 'object' && !Array.isArray(direct)) {
    const inner = direct as Record<string, unknown>;
    for (const k of ['data', 'suppliers', 'summary', 'list', 'notes'] as const) {
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
    for (const k of ['cdna', 'cdnra'] as const) {
      const nested = d[k];
      if (Array.isArray(nested)) {
        return nested;
      }
    }
  }
  return [];
}

function extractCdnaRawArray(payload: unknown): unknown[] {
  const root = gstr2AsRecord(payload);
  if (!root) {
    return [];
  }
  const msg = gstr2AsRecord(root['message']);
  if (msg) {
    const fromMsg = extractCdnaArrayFromMessage(msg);
    if (fromMsg.length > 0) {
      return fromMsg;
    }
  }
  for (const k of ['cdna', 'cdnra', 'CDNA', 'data', 'Data'] as const) {
    const v = root[k];
    if (Array.isArray(v)) {
      return v;
    }
  }
  return [];
}

function mapCdnaNoteStub(
  raw: Record<string, unknown>,
  parent?: Record<string, unknown>,
): CdnaNoteStub {
  const merged = parent ? { ...parent, ...raw } : raw;
  return {
    supplierGstin: gstr2PickField(merged, [
      'ctin',
      'CTIN',
      'gstin',
      'GSTIN',
      'supplier_gstin',
    ]).toUpperCase(),
    supplierName: gstr2PickField(merged, [
      'cname',
      'trade_name',
      'trdnm',
      'lgnm',
      'supplier_name',
      'name',
    ]),
    noteNumber: gstr2PickField(merged, [
      'nt_num',
      'ntnum',
      'note_no',
      'note_number',
      'doc_num',
      'inum',
    ]),
    gstr1FilingStatus: gstr2PickField(merged, ['cfs', 'CFS', 'filing_status']),
    gstr1FilingDate: gstr2PickField(merged, ['fldtr1', 'dof', 'filing_date']),
    gstr1FilingPeriod: gstr2PickField(merged, ['flprdr1', 'ret_prd', 'retprd']),
    gstr3bFilingStatus: gstr2PickField(merged, ['cfs3b', 'CFS3B', 'gstr3b_filing_status']),
    cancellationDate: gstr2PickField(merged, ['cxdt', 'dt_canc', 'cancellation_date']),
  };
}

function flattenCdnaNotes(items: unknown[]): CdnaNoteStub[] {
  const out: CdnaNoteStub[] = [];

  for (const item of items) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      continue;
    }
    const rec = item as Record<string, unknown>;
    const ctin = gstr2PickField(rec, ['ctin', 'CTIN', 'gstin']).toUpperCase();
    if (ctin.length === 15 && !rec['nt'] && !rec['notes'] && !rec['inv']) {
      out.push(mapCdnaNoteStub(rec));
      continue;
    }
    const noteBuckets = [
      rec['nt'],
      rec['notes'],
      rec['note'],
      rec['inv'],
      rec['invoice'],
      rec['documents'],
      rec['cdn'],
      rec['cdna'],
    ];
    let expanded = false;
    for (const bucket of noteBuckets) {
      if (!Array.isArray(bucket) || bucket.length === 0) {
        continue;
      }
      expanded = true;
      for (const note of bucket) {
        if (note && typeof note === 'object' && !Array.isArray(note)) {
          out.push(mapCdnaNoteStub(note as Record<string, unknown>, rec));
        }
      }
    }
    if (!expanded) {
      out.push(mapCdnaNoteStub(rec));
    }
  }

  return out;
}

function aggregateCdnaSuppliers(
  notes: readonly CdnaNoteStub[],
): Gstr2aCdnaSupplierSummary[] {
  const map = new Map<string, Gstr2aCdnaSupplierSummary>();

  for (const n of notes) {
    const g = n.supplierGstin;
    if (!g) {
      continue;
    }
    const cur = map.get(g);
    if (!cur) {
      map.set(g, {
        supplierGstin: g,
        supplierName: n.supplierName,
        noteCount: 1,
        gstr1FilingStatus: n.gstr1FilingStatus,
        gstr1FilingDate: n.gstr1FilingDate,
        gstr1FilingPeriod: n.gstr1FilingPeriod,
        gstr3bFilingStatus: n.gstr3bFilingStatus,
        cancellationDate: n.cancellationDate,
      });
      continue;
    }
    const next: Gstr2aCdnaSupplierSummary = {
      ...cur,
      noteCount: cur.noteCount + 1,
      supplierName: cur.supplierName || n.supplierName,
    };
    map.set(g, next);
  }

  return [...map.values()].sort((a, b) =>
    a.supplierGstin.localeCompare(b.supplierGstin),
  );
}

/**
 * Normalizes GSTZen `POST gstr2/cdna/` into supplier-level rows.
 */
export function parseGstr2CdnaSuppliersFromPayload(
  payload: unknown,
): Gstr2aCdnaSupplierSummary[] {
  const raw = extractCdnaRawArray(payload);
  const flat = flattenCdnaNotes(raw);
  const seen = new Set<string>();
  const unique: CdnaNoteStub[] = [];
  for (const row of flat) {
    const key = `${row.supplierGstin}::${row.noteNumber}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(row);
  }
  return aggregateCdnaSuppliers(unique);
}

export function gstr2CdnaLogicalError(payload: unknown): string | null {
  return gstr2LogicalError(payload, 'GSTR-2 CDNA');
}

export interface Gstr2aCdnaCsvColumn {
  readonly label: string;
  readonly field: keyof Gstr2aCdnaSupplierSummary;
}

const GSTR2A_CDNA_CSV_COLUMNS: readonly Gstr2aCdnaCsvColumn[] = [
  { label: 'GSTIN of Supplier', field: 'supplierGstin' },
  { label: 'Supplier Name', field: 'supplierName' },
  { label: 'No. of notes', field: 'noteCount' },
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

export function gstr2aCdnaSuppliersToCsv(
  rows: readonly Gstr2aCdnaSupplierSummary[],
  columns: readonly Gstr2aCdnaCsvColumn[] = GSTR2A_CDNA_CSV_COLUMNS,
): string {
  const escape = (cell: string): string => {
    const s = cell.replace(/"/g, '""');
    return /[",\n\r]/.test(s) ? `"${s}"` : s;
  };
  const lines = [
    columns.map((c) => escape(c.label)).join(','),
    ...rows.map((r) =>
      columns.map((c) => {
        const v = r[c.field];
        return escape(typeof v === 'number' ? String(v) : gstr2Str(v));
      }).join(','),
    ),
  ];
  return lines.join('\n');
}
