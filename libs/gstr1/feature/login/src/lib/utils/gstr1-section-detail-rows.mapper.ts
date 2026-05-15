import type { Gstr1DownloadApiName } from '@ramsoft-builder/gstr1/data-access/gstzen-auth';
import {
  mergeGstrTaxLineFields,
  parseGstr1DownloadHierarchy,
} from '@ramsoft-builder/gstr1/data-access/gstzen-auth';
import type { Gstr1SectionDetailRow } from '../models/gstr1-return-section.model';
import { uiKindForDownloadApi } from '../models/gstr1-return-section.model';

function pickStr(o: Record<string, unknown>, keys: readonly string[]): string {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'string' && v.trim()) {
      return v.trim();
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

function pickNum(o: Record<string, unknown>, keys: readonly string[]): number | undefined {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'number' && Number.isFinite(v)) {
      return v;
    }
    if (typeof v === 'string' && v.trim() !== '') {
      const n = Number.parseFloat(v);
      if (Number.isFinite(n)) {
        return n;
      }
    }
  }
  return undefined;
}

function collectInvoiceObjects(record: Record<string, unknown>): Record<string, unknown>[] {
  const invRaw = record['inv'];
  if (Array.isArray(invRaw)) {
    return invRaw.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object');
  }
  return [record];
}

function mergeExtraFromInvoiceLike(
  target: Record<string, unknown>,
  invObj: Record<string, unknown>,
): void {
  const keys = [
    'exp_typ',
    'Exp_Typ',
    'sbnum',
    'sbdt',
    'sbpcode',
    'portcd',
    'Gst_payment',
    'GST_payment',
    'gst_payment',
  ] as const;
  for (const k of keys) {
    if (invObj[k] !== undefined && invObj[k] !== null && target[k] === undefined) {
      target[k] = invObj[k] as unknown;
    }
  }
}

/** Pull nested invoice payloads from a bucket row for attribute lookup. */
function flattenRawInvoiceMaps(bucket: readonly unknown[]): Map<string, Record<string, unknown>> {
  const map = new Map<string, Record<string, unknown>>();
  for (const rec of bucket) {
    if (!rec || typeof rec !== 'object') {
      continue;
    }
    const row = rec as Record<string, unknown>;
    const ctin = pickStr(row, ['ctin', 'CTIN']).trim().toUpperCase() || '—';
    for (const invObj of collectInvoiceObjects(row)) {
      const mergedBase: Record<string, unknown> = { ...row };
      mergeExtraFromInvoiceLike(mergedBase, invObj);
      const inum =
        pickStr(invObj, ['inum', 'INUM']) ||
        pickStr(invObj, ['doc_num', 'docnum', 'nt_num', 'ntnum']);
      const idt =
        pickStr(invObj, ['idt']) || pickStr(invObj, ['doc_dt', 'docdt', 'nt_dt', 'ntdt']);
      const key = `${ctin}|${inum}|${idt}`;
      map.set(key, { ...mergedBase, ...invObj });
    }
  }
  return map;
}

function gstPaymentLabel(raw: Record<string, unknown>): string {
  const flags = [
    pickStr(raw, ['exp_typ', 'Exp_Typ']),
    pickStr(raw, ['GST_payment', 'gst_payment']),
    pickStr(raw, ['rchrg', 'rev']),
  ]
    .join(' ')
    .toUpperCase();
  if (flags.includes('WPAY')) {
    return 'Without Payment of Tax';
  }
  if (flags.includes('WOP')) {
    return 'Without Payment of Tax';
  }
  if (flags.includes('PAY')) {
    return 'With Payment of Tax';
  }
  return pickStr(raw, ['GST_payment', 'gst_payment']) || '';
}

function mapHsnRecord(raw: Record<string, unknown>, idx: number): Gstr1SectionDetailRow {
  const merged = mergeGstrTaxLineFields(raw);
  const qty = pickNum(raw, ['qty', 'QTY', 'quantity']);
  const tx = merged.taxableValue;
  return {
    rowId: `hsn-${idx}-${pickStr(raw, ['hsn_sc', 'hsn_cd'])}`,
    ctin: '—',
    invoiceNo: pickStr(raw, ['hsn_sc', 'hsn_cd']) || '—',
    invoiceDate: '—',
    invoiceValue:
      tx + merged.igst + merged.cgst + merged.sgst + merged.cess !== 0
        ? tx + merged.igst + merged.cgst + merged.sgst + merged.cess
        : null,
    taxableTotal: tx,
    igst: merged.igst,
    cgst: merged.cgst,
    sgst: merged.sgst,
    cess: merged.cess,
    pos: '',
    reverseCharge: '',
    irn: '',
    hsnCode: pickStr(raw, ['hsn_sc', 'hsn_cd']),
    description: pickStr(raw, ['desc', 'description']) || pickStr(raw, ['user_desc']),
    uqc: pickStr(raw, ['uqc', 'UQC']),
    quantity: qty,
    items: [
      {
        lineLabel: 'HSN line',
        taxableValue: merged.taxableValue,
        igst: merged.igst,
        cgst: merged.cgst,
        sgst: merged.sgst,
        cess: merged.cess,
      },
    ],
    source: 'api',
    statusLabel: 'Processed',
  };
}

export function mapBucketToSectionRows(
  api: Gstr1DownloadApiName,
  bucket: readonly unknown[],
): Gstr1SectionDetailRow[] {
  const kind = uiKindForDownloadApi(api);
  if (kind === 'hsn') {
    return bucket.map((r, i) =>
      r && typeof r === 'object'
        ? mapHsnRecord(r as Record<string, unknown>, i)
        : ({
            rowId: `hsn-${i}`,
            ctin: '—',
            invoiceNo: '—',
            invoiceDate: '—',
            invoiceValue: null,
            taxableTotal: 0,
            igst: 0,
            cgst: 0,
            sgst: 0,
            cess: 0,
            pos: '',
            reverseCharge: '',
            irn: '',
            items: [],
            source: 'api',
          } satisfies Gstr1SectionDetailRow),
    );
  }

  const rawMap = flattenRawInvoiceMaps(bucket);
  const hierarchy = parseGstr1DownloadHierarchy([...bucket]);
  const rows: Gstr1SectionDetailRow[] = [];

  for (const g of hierarchy) {
    const ctin = g.ctin;
    for (const inv of g.invoices) {
      const key = `${ctin}|${inv.invoiceNo}|${inv.invoiceDate}`;
      const raw = rawMap.get(key) ?? {};
      let taxableTotal = 0;
      let igst = 0;
      let cgst = 0;
      let sgst = 0;
      let cess = 0;
      const items = inv.items.map((it) => {
        taxableTotal += it.taxableValue;
        igst += it.igst;
        cgst += it.cgst;
        sgst += it.sgst;
        cess += it.cess;
        return {
          lineLabel: it.lineLabel,
          taxableValue: it.taxableValue,
          igst: it.igst,
          cgst: it.cgst,
          sgst: it.sgst,
          cess: it.cess,
        };
      });

      const noteNumber =
        pickStr(raw, ['nt_num', 'ntnum']) || (kind === 'cdnr' || kind === 'cdnur' ? inv.invoiceNo : '');
      const noteDate =
        pickStr(raw, ['nt_dt', 'ntdt']) || (kind === 'cdnr' || kind === 'cdnur' ? inv.invoiceDate : '');
      const noteType = pickStr(raw, ['ntty', 'NTTY']);

      const rate =
        pickNum(raw, ['rt', 'rate']) ??
        (items.length === 1 ? pickNum(raw as Record<string, unknown>, ['rt', 'rate']) : undefined);

      rows.push({
        rowId: `api-${ctin}-${inv.invoiceKey}`,
        ctin,
        invoiceNo: kind === 'cdnr' || kind === 'cdnur' ? noteNumber || inv.invoiceNo : inv.invoiceNo,
        invoiceDate: kind === 'cdnr' || kind === 'cdnur' ? noteDate || inv.invoiceDate : inv.invoiceDate,
        invoiceValue: inv.invoiceValue,
        taxableTotal,
        igst,
        cgst,
        sgst,
        cess,
        pos: inv.pos || pickStr(raw, ['pos']),
        reverseCharge: inv.reverseCharge,
        irn: inv.irn,
        gstPayment: kind === 'exp' ? gstPaymentLabel(raw) : undefined,
        shippingBillNo: pickStr(raw, ['sbnum', 'shippingbill']),
        shippingBillDate: pickStr(raw, ['sbdt']),
        portCode: pickStr(raw, ['sbpcode', 'portcd']),
        exportType: pickStr(raw, ['exp_typ', 'Exp_Typ']),
        noteNumber: noteNumber || undefined,
        noteDate: noteDate || undefined,
        noteType: noteType || undefined,
        rate,
        items,
        source: 'api',
        statusLabel: 'Processed',
      });
    }
  }

  return rows;
}
