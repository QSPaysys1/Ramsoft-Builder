import type { Gstr2aIsdCreditRow } from './gstr2-isd.models';
import {
  gstr2AsRecord,
  gstr2LogicalError,
  gstr2PickField,
  gstr2Str,
} from './gstr2-response.utils';

function extractIsdSectionArray(
  msg: Record<string, unknown>,
  sectionKey: 'isd' | 'isda',
): unknown[] {
  const direct = msg[sectionKey];
  if (Array.isArray(direct)) {
    return direct;
  }
  if (direct && typeof direct === 'object' && !Array.isArray(direct)) {
    const inner = direct as Record<string, unknown>;
    for (const k of ['data', 'list', 'credits', 'documents', 'doclist'] as const) {
      const v = inner[k];
      if (Array.isArray(v)) {
        return v;
      }
    }
    return [direct];
  }
  const data = msg['data'];
  if (data && typeof data === 'object') {
    const nested = (data as Record<string, unknown>)[sectionKey];
    if (Array.isArray(nested)) {
      return nested;
    }
  }
  return [];
}

function extractIsdRawArray(payload: unknown): unknown[] {
  const root = gstr2AsRecord(payload);
  if (!root) {
    return [];
  }
  const msg = gstr2AsRecord(root['message']);
  if (msg) {
    const fromMsg = extractIsdSectionArray(msg, 'isd');
    if (fromMsg.length > 0) {
      return fromMsg;
    }
  }
  for (const k of ['isd', 'ISD', 'data', 'Data'] as const) {
    const v = root[k];
    if (Array.isArray(v)) {
      return v;
    }
  }
  return [];
}

function mapIsdCreditRow(
  raw: Record<string, unknown>,
  parent?: Record<string, unknown>,
): Gstr2aIsdCreditRow {
  const merged = parent ? { ...parent, ...raw } : raw;
  return {
    isdGstin: gstr2PickField(merged, [
      'ctin',
      'CTIN',
      'gstin',
      'GSTIN',
      'isd_gstin',
      'isdGstin',
    ]).toUpperCase(),
    isdName: gstr2PickField(merged, [
      'cname',
      'trade_name',
      'trdnm',
      'lgnm',
      'isd_name',
      'name',
    ]),
    documentType: gstr2PickField(merged, [
      'isd_docty',
      'docty',
      'doc_type',
      'document_type',
      'typ',
    ]),
    documentNumber: gstr2PickField(merged, [
      'docnum',
      'doc_num',
      'document_number',
      'isd_docnum',
      'inum',
    ]),
    documentDate: gstr2PickField(merged, [
      'docdt',
      'doc_dt',
      'document_date',
      'isd_docdt',
      'idt',
    ]),
    originalInvoiceNo: gstr2PickField(merged, [
      'oinum',
      'o_inum',
      'orig_inum',
      'original_invoice_no',
    ]),
    originalInvoiceDate: gstr2PickField(merged, [
      'oidt',
      'o_idt',
      'orig_idt',
      'original_invoice_date',
    ]),
    placeOfSupply: gstr2PickField(merged, ['pos', 'place_of_supply', 'placeOfSupply']),
    integratedTax: gstr2PickField(merged, ['iamt', 'igst', 'igst_amt', 'integrated_tax']),
    centralTax: gstr2PickField(merged, ['camt', 'cgst', 'cgst_amt', 'central_tax']),
    stateTax: gstr2PickField(merged, ['samt', 'sgst', 'sgst_amt', 'state_tax']),
    cess: gstr2PickField(merged, ['csamt', 'cess', 'cess_amt']),
    gstr1FilingStatus: gstr2PickField(merged, ['cfs', 'CFS', 'filing_status']),
    gstr1FilingDate: gstr2PickField(merged, ['fldtr1', 'dof', 'filing_date']),
    gstr3bFilingStatus: gstr2PickField(merged, ['cfs3b', 'CFS3B', 'gstr3b_filing_status']),
  };
}

function flattenIsdCredits(items: unknown[]): Gstr2aIsdCreditRow[] {
  const out: Gstr2aIsdCreditRow[] = [];

  for (const item of items) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      continue;
    }
    const rec = item as Record<string, unknown>;
    const docBuckets = [
      rec['doclist'],
      rec['doc'],
      rec['docs'],
      rec['documents'],
      rec['inv'],
      rec['credit'],
      rec['credits'],
    ];
    let expanded = false;
    for (const bucket of docBuckets) {
      if (!Array.isArray(bucket) || bucket.length === 0) {
        continue;
      }
      expanded = true;
      for (const doc of bucket) {
        if (doc && typeof doc === 'object' && !Array.isArray(doc)) {
          out.push(mapIsdCreditRow(doc as Record<string, unknown>, rec));
        }
      }
    }
    if (!expanded) {
      const mapped = mapIsdCreditRow(rec);
      if (
        mapped.isdGstin.length === 15 ||
        mapped.documentNumber ||
        mapped.documentDate
      ) {
        out.push(mapped);
      }
    }
  }

  return out;
}

export function gstr2aIsdRowKey(row: Gstr2aIsdCreditRow): string {
  return [
    row.isdGstin,
    row.documentNumber,
    row.documentDate,
    row.documentType,
  ].join('::');
}

function extractIsdaRawArray(payload: unknown): unknown[] {
  const root = gstr2AsRecord(payload);
  if (!root) {
    return [];
  }
  const msg = gstr2AsRecord(root['message']);
  if (msg) {
    const fromMsg = extractIsdSectionArray(msg, 'isda');
    if (fromMsg.length > 0) {
      return fromMsg;
    }
  }
  for (const k of ['isda', 'ISDA'] as const) {
    const v = root[k];
    if (Array.isArray(v)) {
      return v;
    }
  }
  return [];
}

export type Gstr2aIsdSection = 'isd' | 'isda';

/**
 * Normalizes GSTZen `POST gstr2/isd/` into ISD / ISD-amendment credit rows.
 */
export function parseGstr2IsdCreditsFromPayload(
  payload: unknown,
  section: Gstr2aIsdSection = 'isd',
): Gstr2aIsdCreditRow[] {
  const raw = section === 'isda' ? extractIsdaRawArray(payload) : extractIsdRawArray(payload);
  const flat = flattenIsdCredits(raw);
  const seen = new Set<string>();
  const unique: Gstr2aIsdCreditRow[] = [];
  for (const row of flat) {
    const key = gstr2aIsdRowKey(row);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(row);
  }
  return unique.sort((a, b) => {
    const g = a.isdGstin.localeCompare(b.isdGstin);
    if (g !== 0) {
      return g;
    }
    return a.documentNumber.localeCompare(b.documentNumber);
  });
}

export function gstr2IsdLogicalError(
  payload: unknown,
  section: Gstr2aIsdSection = 'isd',
): string | null {
  return gstr2LogicalError(
    payload,
    section === 'isda' ? 'GSTR-2 ISD (Amendment)' : 'GSTR-2 ISD',
  );
}

export interface Gstr2aIsdCsvColumn {
  readonly label: string;
  readonly field: keyof Gstr2aIsdCreditRow;
}

const GSTR2A_ISD_CSV_COLUMNS: readonly Gstr2aIsdCsvColumn[] = [
  { label: 'GSTIN of ISD', field: 'isdGstin' },
  { label: 'Name of ISD', field: 'isdName' },
  { label: 'Document type', field: 'documentType' },
  { label: 'Document number', field: 'documentNumber' },
  { label: 'Document date', field: 'documentDate' },
  { label: 'Original invoice no.', field: 'originalInvoiceNo' },
  { label: 'Original invoice date', field: 'originalInvoiceDate' },
  { label: 'Place of supply', field: 'placeOfSupply' },
  { label: 'Integrated tax', field: 'integratedTax' },
  { label: 'Central tax', field: 'centralTax' },
  { label: 'State/UT tax', field: 'stateTax' },
  { label: 'Cess', field: 'cess' },
  {
    label: 'GSTR-1/IFF/GSTR-1A/GSTR-5 Filing Status',
    field: 'gstr1FilingStatus',
  },
  {
    label: 'GSTR-1/IFF/GSTR-1A/GSTR-5 Filing Date',
    field: 'gstr1FilingDate',
  },
  { label: 'GSTR-3B filing status', field: 'gstr3bFilingStatus' },
];

export function gstr2aIsdRowsToCsv(
  rows: readonly Gstr2aIsdCreditRow[],
  columns: readonly Gstr2aIsdCsvColumn[] = GSTR2A_ISD_CSV_COLUMNS,
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
