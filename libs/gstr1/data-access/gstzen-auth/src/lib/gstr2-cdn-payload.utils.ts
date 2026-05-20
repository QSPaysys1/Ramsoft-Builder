import type {
  Gstr2aCdnBundle,
  Gstr2aCdnItemRow,
  Gstr2aCdnNoteWiseRow,
  Gstr2aCdnRow,
  Gstr2aCdnSupplierSummary,
} from './gstr2-cdn.models';
import { gstr2aCdnNoteKey } from './gstr2-cdn.models';
import {
  gstr2AsRecord,
  gstr2LogicalError,
  gstr2PickField,
  gstr2StatusIndicatesSuccess,
  gstr2Str,
} from './gstr2-response.utils';

function extractCdnArrayFromMessage(msg: Record<string, unknown>): unknown[] {
  const direct = msg['cdn'] ?? msg['cdnr'];
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
    for (const k of ['cdn', 'cdnr'] as const) {
      const nested = d[k];
      if (Array.isArray(nested)) {
        return nested;
      }
    }
  }
  return [];
}

function extractCdnRawArray(payload: unknown): unknown[] {
  const root = gstr2AsRecord(payload);
  if (!root) {
    return [];
  }
  const msg = gstr2AsRecord(root['message']);
  if (msg) {
    const fromMsg = extractCdnArrayFromMessage(msg);
    if (fromMsg.length > 0) {
      return fromMsg;
    }
  }
  for (const k of ['cdn', 'cdnr', 'CDN', 'data', 'Data'] as const) {
    const v = root[k];
    if (Array.isArray(v)) {
      return v;
    }
  }
  return [];
}

function mapItemRow(raw: Record<string, unknown>): Gstr2aCdnItemRow {
  return {
    ratePercent: gstr2PickField(raw, ['rt', 'rate', 'gst_rt', 'tax_rate', 'Rate']),
    taxableValue: gstr2PickField(raw, ['txval', 'taxable_value', 'taxableValue']),
    integratedTax: gstr2PickField(raw, ['iamt', 'igst', 'integrated_tax', 'igst_amt']),
    centralTax: gstr2PickField(raw, ['camt', 'cgst', 'central_tax', 'cgst_amt']),
    stateTax: gstr2PickField(raw, ['samt', 'sgst', 'state_tax', 'sgst_amt']),
    cess: gstr2PickField(raw, ['csamt', 'cess', 'cess_amt']),
  };
}

function extractItems(
  raw: Record<string, unknown>,
): readonly Gstr2aCdnItemRow[] {
  for (const k of ['itms', 'items', 'item', 'line_items', 'lineItems'] as const) {
    const v = raw[k];
    if (!Array.isArray(v)) {
      continue;
    }
    return v
      .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x))
      .map((x) => mapItemRow(x));
  }
  const txval = gstr2PickField(raw, ['txval', 'taxable_value']);
  const rt = gstr2PickField(raw, ['rt', 'rate']);
  if (txval || rt) {
    return [mapItemRow(raw)];
  }
  return [];
}

function mapNoteWiseRow(
  raw: Record<string, unknown>,
  parent?: Record<string, unknown>,
): Gstr2aCdnNoteWiseRow {
  const merged = parent ? { ...parent, ...raw } : raw;
  const items = extractItems(merged);
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
    noteType: gstr2PickField(merged, ['ntty', 'note_type', 'dty', 'typ', 'type', 'nt_typ']),
    noteNumber: gstr2PickField(merged, [
      'nt_num',
      'ntnum',
      'note_no',
      'note_number',
      'nt_num',
      'doc_num',
      'document_number',
      'inum',
    ]),
    noteDate: gstr2PickField(merged, [
      'nt_dt',
      'ntdt',
      'note_date',
      'idt',
      'doc_dt',
      'document_date',
    ]),
    placeOfSupply: gstr2PickField(merged, ['pos', 'place_of_supply', 'placeOfSupply']),
    noteSupplyType: gstr2PickField(merged, [
      'sply_ty',
      'supply_type',
      'note_supply_type',
      'suptyp',
    ]),
    reverseCharge: gstr2PickField(merged, [
      'rchrg',
      'reverse_charge',
      'rev_charge',
      'sup_attr_rc',
    ]),
    taxableValue: gstr2PickField(merged, ['txval', 'taxable_value', 'val', 'taxableValue']),
    integratedTax: gstr2PickField(merged, ['iamt', 'igst', 'integrated_tax']),
    centralTax: gstr2PickField(merged, ['camt', 'cgst', 'central_tax']),
    stateTax: gstr2PickField(merged, ['samt', 'sgst', 'state_tax', 'state_ut_tax']),
    cess: gstr2PickField(merged, ['csamt', 'cess']),
    source: gstr2PickField(merged, ['src', 'source', 'data_source']),
    originalInvoiceNo: gstr2PickField(merged, [
      'oinum',
      'o_inum',
      'original_invoice',
      'ref_inum',
    ]),
    gstr1FilingStatus: gstr2PickField(merged, ['cfs', 'CFS', 'filing_status']),
    gstr1FilingDate: gstr2PickField(merged, ['fldtr1', 'dof', 'filing_date']),
    gstr1FilingPeriod: gstr2PickField(merged, ['flprdr1', 'ret_prd', 'retprd']),
    gstr3bFilingStatus: gstr2PickField(merged, ['cfs3b', 'CFS3B', 'gstr3b_filing_status']),
    cancellationDate: gstr2PickField(merged, ['cxdt', 'dt_canc', 'cancellation_date']),
    items,
  };
}

function flattenCdnNotes(items: unknown[]): Gstr2aCdnNoteWiseRow[] {
  const out: Gstr2aCdnNoteWiseRow[] = [];

  for (const item of items) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      continue;
    }
    const rec = item as Record<string, unknown>;
    const noteBuckets = [
      rec['nt'],
      rec['notes'],
      rec['note'],
      rec['inv'],
      rec['invoice'],
      rec['documents'],
      rec['cdn'],
    ];
    let expanded = false;
    for (const bucket of noteBuckets) {
      if (!Array.isArray(bucket) || bucket.length === 0) {
        continue;
      }
      expanded = true;
      for (const note of bucket) {
        if (note && typeof note === 'object' && !Array.isArray(note)) {
          out.push(mapNoteWiseRow(note as Record<string, unknown>, rec));
        }
      }
    }
    if (!expanded) {
      out.push(mapNoteWiseRow(rec));
    }
  }

  return out;
}

function aggregateSuppliers(
  notes: readonly Gstr2aCdnNoteWiseRow[],
): Gstr2aCdnSupplierSummary[] {
  const map = new Map<
    string,
    {
      supplierGstin: string;
      supplierName: string;
      noteCount: number;
      gstr1FilingStatus: string;
      gstr1FilingDate: string;
      gstr1FilingPeriod: string;
      gstr3bFilingStatus: string;
      cancellationDate: string;
    }
  >();

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
    cur.noteCount += 1;
    if (!cur.supplierName && n.supplierName) {
      cur.supplierName = n.supplierName;
    }
  }

  return [...map.values()].sort((a, b) =>
    a.supplierGstin.localeCompare(b.supplierGstin),
  );
}

export function parseGstr2CdnBundle(payload: unknown): Gstr2aCdnBundle {
  const raw = extractCdnRawArray(payload);
  const flat = flattenCdnNotes(raw);
  const seen = new Set<string>();
  const notes: Gstr2aCdnNoteWiseRow[] = [];
  for (const row of flat) {
    const key = gstr2aCdnNoteKey(row);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    notes.push(row);
  }
  notes.sort((a, b) => {
    const g = a.supplierGstin.localeCompare(b.supplierGstin);
    if (g !== 0) {
      return g;
    }
    return a.noteNumber.localeCompare(b.noteNumber);
  });
  return {
    suppliers: aggregateSuppliers(notes),
    notes,
  };
}

/** Legacy flat list — one row per note. */
export function parseGstr2CdnRowsFromPayload(payload: unknown): Gstr2aCdnRow[] {
  return parseGstr2CdnBundle(payload).notes.map((n) => ({
    supplierGstin: n.supplierGstin,
    supplierName: n.supplierName,
    noteNumber: n.noteNumber,
    noteDate: n.noteDate,
    noteType: n.noteType,
    originalInvoiceNo: n.originalInvoiceNo,
    gstr1FilingStatus: n.gstr1FilingStatus,
    gstr1FilingDate: n.gstr1FilingDate,
    gstr1FilingPeriod: n.gstr1FilingPeriod,
    gstr3bFilingStatus: n.gstr3bFilingStatus,
    cancellationDate: n.cancellationDate,
  }));
}

export function findGstr2aCdnNote(
  bundle: Gstr2aCdnBundle,
  supplierGstin: string,
  noteNumber: string,
  noteDate?: string,
): Gstr2aCdnNoteWiseRow | undefined {
  const g = supplierGstin.trim().toUpperCase();
  const nn = noteNumber.trim();
  return bundle.notes.find(
    (n) =>
      n.supplierGstin === g &&
      n.noteNumber === nn &&
      (!noteDate?.trim() || n.noteDate === noteDate.trim()),
  );
}

export function gstr2CdnLogicalError(payload: unknown): string | null {
  return gstr2LogicalError(payload, 'GSTR-2 CDN');
}

export function isGstr2CdnSuccessEnvelope(
  raw: unknown,
): raw is { readonly message: Record<string, unknown> } {
  return (
    !!raw &&
    typeof raw === 'object' &&
    gstr2StatusIndicatesSuccess(raw) &&
    typeof gstr2AsRecord(raw)?.['message'] === 'object' &&
    gstr2AsRecord(raw)?.['message'] !== null
  );
}

export interface Gstr2aCdnCsvColumn<T extends string = string> {
  readonly label: string;
  readonly field: T;
}

export function gstr2aCdnRowsToCsv<T extends string>(
  rows: readonly Record<T, string>[],
  columns: readonly Gstr2aCdnCsvColumn<T>[],
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
