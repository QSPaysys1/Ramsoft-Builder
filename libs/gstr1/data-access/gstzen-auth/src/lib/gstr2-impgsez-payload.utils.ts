import type { Gstr2aImpgsezRow } from './gstr2-impgsez.models';
import {
  gstr2CoercePayloadRoot,
  gstr2LogicalError,
  gstr2MessageRecord,
  gstr2PickField,
  gstr2StatusIndicatesSuccess,
  gstr2Str,
} from './gstr2-response.utils';

function extractImpgsezArray(payload: unknown): unknown[] {
  const root = gstr2CoercePayloadRoot(payload);
  if (!root) {
    return [];
  }
  const msg = gstr2MessageRecord(root);
  if (msg) {
    const direct = msg['impgsez'] ?? msg['IMPGSEZ'] ?? msg['impg_sez'];
    if (Array.isArray(direct)) {
      return direct;
    }
    if (direct && typeof direct === 'object' && !Array.isArray(direct)) {
      const inner = direct as Record<string, unknown>;
      for (const k of ['data', 'list', 'documents'] as const) {
        const nested = inner[k];
        if (Array.isArray(nested)) {
          return nested;
        }
      }
    }
  }
  for (const k of ['impgsez', 'IMPGSEZ', 'impg_sez', 'data', 'Data'] as const) {
    const v = root[k];
    if (Array.isArray(v)) {
      return v;
    }
  }
  return [];
}

function mapImpgsezRow(raw: Record<string, unknown>): Gstr2aImpgsezRow {
  return {
    referenceDate: gstr2PickField(raw, ['refdt', 'ref_dt', 'reference_date']),
    portCode: gstr2PickField(raw, ['portcd', 'port_cd', 'port_code', 'port']),
    billOfEntryNumber: gstr2PickField(raw, [
      'benum',
      'be_num',
      'bill_of_entry_number',
      'boenum',
    ]),
    billOfEntryDate: gstr2PickField(raw, ['bedt', 'be_dt', 'bill_of_entry_date']),
    sezGstin: gstr2PickField(raw, [
      'sgstin',
      'SGSTIN',
      'sez_gstin',
      'gstin',
      'GSTIN',
    ]).toUpperCase(),
    tradeName: gstr2PickField(raw, [
      'tdname',
      'trade_name',
      'trdnm',
      'lgnm',
      'name',
    ]),
    taxableValue: gstr2PickField(raw, ['txval', 'taxable_value', 'taxableValue']),
    integratedTax: gstr2PickField(raw, ['iamt', 'igst', 'integrated_tax']),
    cess: gstr2PickField(raw, ['csamt', 'cess']),
    amended: gstr2PickField(raw, ['amd', 'amended', 'amendment_flag']),
  };
}

function isImpgsezRow(row: Gstr2aImpgsezRow): boolean {
  return !!(
    row.billOfEntryNumber ||
    row.sezGstin ||
    row.portCode ||
    row.billOfEntryDate ||
    row.taxableValue ||
    row.integratedTax
  );
}

function dedupeRows(rows: Gstr2aImpgsezRow[]): Gstr2aImpgsezRow[] {
  const seen = new Set<string>();
  const unique: Gstr2aImpgsezRow[] = [];
  for (const row of rows) {
    const key = gstr2aImpgsezRowKey(row);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(row);
  }
  return unique.sort((a, b) => {
    const d = a.billOfEntryDate.localeCompare(b.billOfEntryDate);
    if (d !== 0) {
      return d;
    }
    return a.billOfEntryNumber.localeCompare(b.billOfEntryNumber);
  });
}

export function gstr2aImpgsezRowKey(row: Gstr2aImpgsezRow): string {
  return [
    row.billOfEntryNumber,
    row.billOfEntryDate,
    row.sezGstin,
    row.portCode,
    row.referenceDate,
    row.taxableValue,
  ].join('::');
}

export function parseGstr2ImpgsezFromPayload(payload: unknown): readonly Gstr2aImpgsezRow[] {
  const items = extractImpgsezArray(payload);
  const out: Gstr2aImpgsezRow[] = [];
  for (const item of items) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      continue;
    }
    const mapped = mapImpgsezRow(item as Record<string, unknown>);
    if (isImpgsezRow(mapped)) {
      out.push(mapped);
    }
  }
  return dedupeRows(out);
}

export function isGstr2ImpgsezSuccessEnvelope(payload: unknown): boolean {
  const root = gstr2CoercePayloadRoot(payload);
  if (!root) {
    return false;
  }
  if (gstr2StatusIndicatesSuccess(root)) {
    return true;
  }
  return extractImpgsezArray(payload).length > 0;
}

export function gstr2ImpgsezLogicalError(payload: unknown): string | null {
  if (isGstr2ImpgsezSuccessEnvelope(payload)) {
    return null;
  }
  return gstr2LogicalError(payload, 'GSTR-2 IMPGSEZ');
}

export interface Gstr2aImpgsezCsvColumn {
  readonly label: string;
  readonly field: keyof Gstr2aImpgsezRow;
}

const GSTR2A_IMPGSEZ_CSV_COLUMNS: readonly Gstr2aImpgsezCsvColumn[] = [
  { label: 'Bill of entry number', field: 'billOfEntryNumber' },
  { label: 'Bill of entry date', field: 'billOfEntryDate' },
  { label: 'GSTIN of SEZ supplier', field: 'sezGstin' },
  { label: 'Trade name', field: 'tradeName' },
  { label: 'Reference date', field: 'referenceDate' },
  { label: 'Port code', field: 'portCode' },
  { label: 'Taxable value', field: 'taxableValue' },
  { label: 'Integrated tax', field: 'integratedTax' },
  { label: 'Cess', field: 'cess' },
  { label: 'Amended', field: 'amended' },
];

export function gstr2aImpgsezRowsToCsv(
  rows: readonly Gstr2aImpgsezRow[],
  columns: readonly Gstr2aImpgsezCsvColumn[] = GSTR2A_IMPGSEZ_CSV_COLUMNS,
): string {
  const escape = (cell: string): string => {
    const s = cell.replace(/"/g, '""');
    return /[",\n\r]/.test(s) ? `"${s}"` : s;
  };
  const lines = [
    columns.map((c) => escape(c.label)).join(','),
    ...rows.map((r) =>
      columns.map((c) => escape(gstr2Str(r[c.field]))).join(','),
    ),
  ];
  return lines.join('\n');
}
