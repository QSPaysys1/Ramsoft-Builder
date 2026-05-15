import type { Gstr1DownloadApiName } from '@ramsoft-builder/gstr1/data-access/gstzen-auth';
import type { Gstr1SectionDetailRow } from '../models/gstr1-return-section.model';
import { uiKindForDownloadApi } from '../models/gstr1-return-section.model';

/** Minimal E-way bill JSON shape (GSTZen / NIC-style) for local import. */
export interface Gstr1EwbImportRow {
  readonly docNo?: string;
  readonly docDate?: string;
  readonly fromGstin?: string;
  readonly toGstin?: string;
  readonly docType?: string;
  readonly totalValue?: number;
  readonly totInvValue?: number;
  readonly igstValue?: number;
  readonly cgstValue?: number;
  readonly sgstValue?: number;
  readonly cessValue?: number;
  readonly transactionType?: number;
  readonly itemList?: readonly Gstr1EwbItemImport[];
}

export interface Gstr1EwbItemImport {
  readonly taxableAmount?: number;
  readonly igstRate?: number;
  readonly cgstRate?: number;
  readonly sgstRate?: number;
  readonly cessRate?: number;
  readonly hsnCode?: number | string;
  readonly quantity?: number;
  readonly qtyUnit?: string;
  readonly productDesc?: string;
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

function str(v: unknown): string {
  if (typeof v === 'string') {
    return v.trim();
  }
  if (typeof v === 'number' && Number.isFinite(v)) {
    return String(v);
  }
  return '';
}

function unwrapArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) {
    return raw;
  }
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    const inner = o['items'] ?? o['data'] ?? o['results'];
    if (Array.isArray(inner)) {
      return inner;
    }
    return [raw];
  }
  return [];
}

/** Parses pasted/uploaded JSON into loosely typed EWB rows. */
export function parseEwbImportPayload(raw: unknown): Gstr1EwbImportRow[] {
  const arr = unwrapArray(raw);
  const out: Gstr1EwbImportRow[] = [];
  for (const row of arr) {
    if (!row || typeof row !== 'object') {
      continue;
    }
    const o = row as Record<string, unknown>;
    const itemsRaw = o['itemList'];
    const items = Array.isArray(itemsRaw)
      ? itemsRaw.filter((x): x is Gstr1EwbItemImport => !!x && typeof x === 'object')
      : [];
    out.push({
      docNo: str(o['docNo'] ?? o['doc_no']),
      docDate: str(o['docDate'] ?? o['doc_date']),
      fromGstin: str(o['fromGstin'] ?? o['from_gstin']),
      toGstin: str(o['toGstin'] ?? o['to_gstin']),
      docType: str(o['docType'] ?? o['doc_type']),
      totalValue: num(o['totalValue'] ?? o['total_value']),
      totInvValue: num(o['totInvValue'] ?? o['tot_inv_value']),
      igstValue: num(o['igstValue'] ?? o['igst_value']),
      cgstValue: num(o['cgstValue'] ?? o['cgst_value']),
      sgstValue: num(o['sgstValue'] ?? o['sgst_value']),
      cessValue: num(o['cessValue'] ?? o['cess_value']),
      transactionType:
        typeof o['transactionType'] === 'number'
          ? o['transactionType']
          : typeof o['transaction_type'] === 'number'
            ? o['transaction_type']
            : undefined,
      itemList: items.map((it) => {
        const r = it as Record<string, unknown>;
        const hRaw = r['hsnCode'] ?? r['hsn_code'];
        const hsnCode =
          typeof hRaw === 'number' || typeof hRaw === 'string' ? hRaw : undefined;
        return {
          taxableAmount: num(r['taxableAmount'] ?? r['taxable_amount']),
          igstRate: num(r['igstRate'] ?? r['igst_rate']),
          cgstRate: num(r['cgstRate'] ?? r['cgst_rate']),
          sgstRate: num(r['sgstRate'] ?? r['sgst_rate']),
          cessRate: num(r['cessRate'] ?? r['cess_rate']),
          hsnCode,
          quantity: num(r['quantity']),
          qtyUnit: str(r['qtyUnit'] ?? r['qty_unit']),
          productDesc: str(r['productDesc'] ?? r['product_desc']),
        };
      }),
    });
  }
  return out;
}

export function mapEwbRowsToSectionRows(
  api: Gstr1DownloadApiName,
  ewbs: readonly Gstr1EwbImportRow[],
): Gstr1SectionDetailRow[] {
  const kind = uiKindForDownloadApi(api);
  return ewbs.map((ewb, idx) => {
    const lines =
      ewb.itemList && ewb.itemList.length > 0
        ? ewb.itemList.map((it, i) => ({
            lineLabel: `EWB item ${i + 1}`,
            taxableValue: it.taxableAmount ?? 0,
            igst:
              it.taxableAmount && it.igstRate
                ? (it.taxableAmount * it.igstRate) / 100
                : 0,
            cgst:
              it.taxableAmount && it.cgstRate
                ? (it.taxableAmount * it.cgstRate) / 100
                : 0,
            sgst:
              it.taxableAmount && it.sgstRate
                ? (it.taxableAmount * it.sgstRate) / 100
                : 0,
            cess:
              it.taxableAmount && it.cessRate ? (it.taxableAmount * it.cessRate) / 100 : 0,
          }))
        : [
            {
              lineLabel: 'EWB totals',
              taxableValue: (() => {
                const tv = ewb.totalValue;
                if (tv && tv > 0) {
                  return tv;
                }
                const inv = ewb.totInvValue ?? 0;
                const taxSum =
                  (ewb.igstValue ?? 0) +
                  (ewb.cgstValue ?? 0) +
                  (ewb.sgstValue ?? 0) +
                  (ewb.cessValue ?? 0);
                return Math.max(0, inv - taxSum);
              })(),
              igst: ewb.igstValue ?? 0,
              cgst: ewb.cgstValue ?? 0,
              sgst: ewb.sgstValue ?? 0,
              cess: ewb.cessValue ?? 0,
            },
          ];

    let taxableTotal = 0;
    let igst = 0;
    let cgst = 0;
    let sgst = 0;
    let cess = 0;
    for (const ln of lines) {
      taxableTotal += ln.taxableValue;
      igst += ln.igst;
      cgst += ln.cgst;
      sgst += ln.sgst;
      cess += ln.cess;
    }

    const ctin =
      kind === 'b2cl' || kind === 'b2cs' || kind === 'exp'
        ? 'URP'
        : (ewb.toGstin || '').trim().toUpperCase() || '—';

    const firstItem = ewb.itemList?.[0];

    return {
      rowId: `ewb-${idx}-${ewb.docNo ?? idx}`,
      ctin,
      invoiceNo: ewb.docNo || `EWB-${idx + 1}`,
      invoiceDate: ewb.docDate || '—',
      invoiceValue: ewb.totInvValue || ewb.totalValue || null,
      taxableTotal,
      igst,
      cgst,
      sgst,
      cess,
      pos: '',
      reverseCharge: '',
      irn: '',
      hsnCode:
        kind === 'hsn'
          ? String(firstItem?.hsnCode ?? '')
          : firstItem?.hsnCode !== undefined
            ? String(firstItem.hsnCode)
            : undefined,
      uqc: firstItem?.qtyUnit,
      quantity: firstItem?.quantity,
      description: firstItem?.productDesc,
      items: lines,
      source: 'ewb',
      statusLabel: 'Imported',
    } satisfies Gstr1SectionDetailRow;
  });
}
