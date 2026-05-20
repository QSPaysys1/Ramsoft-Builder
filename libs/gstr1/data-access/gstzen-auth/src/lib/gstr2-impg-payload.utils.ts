import type { Gstr2aImpgRow } from './gstr2-impg.models';
import {
  gstr2AsRecord,
  gstr2CoercePayloadRoot,
  gstr2LogicalError,
  gstr2MessageRecord,
  gstr2PickField,
  gstr2StatusIndicatesSuccess,
  gstr2Str,
} from './gstr2-response.utils';

function extractImpgArray(payload: unknown): unknown[] {
  const root = gstr2CoercePayloadRoot(payload);
  if (!root) {
    return [];
  }
  const msg = gstr2MessageRecord(root);
  if (msg) {
    const direct = msg['impg'] ?? msg['IMPG'];
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
  for (const k of ['impg', 'IMPG', 'data', 'Data'] as const) {
    const v = root[k];
    if (Array.isArray(v)) {
      return v;
    }
  }
  return [];
}

function mapImpgRow(raw: Record<string, unknown>): Gstr2aImpgRow {
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
    taxableValue: gstr2PickField(raw, ['txval', 'taxable_value', 'taxableValue']),
    integratedTax: gstr2PickField(raw, ['iamt', 'igst', 'integrated_tax']),
    cess: gstr2PickField(raw, ['csamt', 'cess']),
    amended: gstr2PickField(raw, ['amd', 'amended', 'amendment_flag']),
  };
}

function isImpgRow(row: Gstr2aImpgRow): boolean {
  return !!(
    row.billOfEntryNumber ||
    row.portCode ||
    row.billOfEntryDate ||
    row.taxableValue ||
    row.integratedTax
  );
}

function dedupeRows(rows: Gstr2aImpgRow[]): Gstr2aImpgRow[] {
  const seen = new Set<string>();
  const unique: Gstr2aImpgRow[] = [];
  for (const row of rows) {
    const key = gstr2aImpgRowKey(row);
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

export function gstr2aImpgRowKey(row: Gstr2aImpgRow): string {
  return [
    row.billOfEntryNumber,
    row.billOfEntryDate,
    row.portCode,
    row.referenceDate,
    row.taxableValue,
  ].join('::');
}

export function parseGstr2ImpgFromPayload(payload: unknown): readonly Gstr2aImpgRow[] {
  const items = extractImpgArray(payload);
  const out: Gstr2aImpgRow[] = [];
  for (const item of items) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      continue;
    }
    const mapped = mapImpgRow(item as Record<string, unknown>);
    if (isImpgRow(mapped)) {
      out.push(mapped);
    }
  }
  return dedupeRows(out);
}

export function isGstr2ImpgSuccessEnvelope(payload: unknown): boolean {
  const root = gstr2CoercePayloadRoot(payload);
  if (!root) {
    return false;
  }
  if (gstr2StatusIndicatesSuccess(root)) {
    return true;
  }
  return extractImpgArray(payload).length > 0;
}

export function gstr2ImpgLogicalError(payload: unknown): string | null {
  if (isGstr2ImpgSuccessEnvelope(payload)) {
    return null;
  }
  return gstr2LogicalError(payload, 'GSTR-2 IMPG');
}

export interface Gstr2aImpgCsvColumn {
  readonly label: string;
  readonly field: keyof Gstr2aImpgRow;
}

const GSTR2A_IMPG_CSV_COLUMNS: readonly Gstr2aImpgCsvColumn[] = [
  { label: 'Bill of entry number', field: 'billOfEntryNumber' },
  { label: 'Bill of entry date', field: 'billOfEntryDate' },
  { label: 'Reference date', field: 'referenceDate' },
  { label: 'Port code', field: 'portCode' },
  { label: 'Taxable value', field: 'taxableValue' },
  { label: 'Integrated tax', field: 'integratedTax' },
  { label: 'Cess', field: 'cess' },
  { label: 'Amended', field: 'amended' },
];

export function gstr2aImpgRowsToCsv(
  rows: readonly Gstr2aImpgRow[],
  columns: readonly Gstr2aImpgCsvColumn[] = GSTR2A_IMPG_CSV_COLUMNS,
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
