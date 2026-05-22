import type {
  Gstr3bAutoliabBundle,
  Gstr3bAutoliabMeta,
  Gstr3bExemptAmounts,
  Gstr3bInterStateAmounts,
  Gstr3bPaymentAmounts,
  Gstr3bTaxAmounts,
} from '@ramsoft-builder/gstr3b/models/entities';
import {
  extractLiabitc,
  gstr2AsRecord,
  gstr2CoercePayloadRoot,
  gstr2LogicalError,
  gstr2MessageRecord,
  gstr2StatusIndicatesSuccess,
} from '@ramsoft-builder/gstr3b/utils/helpers';

const ZERO_TAX: Gstr3bTaxAmounts = {
  igst: '0.00',
  cgst: '0.00',
  sgst: '0.00',
  cess: '0.00',
};

function formatAmount(v: unknown): string {
  if (v === null || v === undefined || v === '') {
    return '0.00';
  }
  const n =
    typeof v === 'number'
      ? v
      : Number.parseFloat(typeof v === 'string' ? v.trim().replace(/,/g, '') : String(v));
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}

function addAmounts(a: string, b: unknown): string {
  const sum = Number.parseFloat(a) + Number.parseFloat(formatAmount(b));
  return Number.isFinite(sum) ? sum.toFixed(2) : a;
}

function taxFromRecord(raw: Record<string, unknown> | undefined): Gstr3bTaxAmounts {
  if (!raw) {
    return { ...ZERO_TAX };
  }
  return {
    igst: formatAmount(raw['iamt'] ?? raw['igst']),
    cgst: formatAmount(raw['camt'] ?? raw['cgst']),
    sgst: formatAmount(raw['samt'] ?? raw['sgst']),
    cess: formatAmount(raw['csamt'] ?? raw['cess']),
  };
}

function sumTaxRecords(records: readonly Record<string, unknown>[]): Gstr3bTaxAmounts {
  let out = { ...ZERO_TAX };
  for (const rec of records) {
    const t = taxFromRecord(rec);
    out = {
      igst: addAmounts(out.igst, t.igst),
      cgst: addAmounts(out.cgst, t.cgst),
      sgst: addAmounts(out.sgst, t.sgst),
      cess: addAmounts(out.cess, t.cess),
    };
  }
  return out;
}

function subtotalFromSection(section: Record<string, unknown> | undefined): Gstr3bTaxAmounts {
  return taxFromRecord(gstr2AsRecord(section?.['subtotal']));
}

function interSupSubtotals(interSup: Record<string, unknown> | undefined): Gstr3bInterStateAmounts {
  if (!interSup) {
    return { taxableValue: '0.00', igst: '0.00' };
  }
  let txval = '0.00';
  let iamt = '0.00';
  for (const v of Object.values(interSup)) {
    const sec = gstr2AsRecord(v);
    if (!sec) {
      continue;
    }
    const sub = sec['subtotal'];
    const rows = Array.isArray(sub) ? sub : sub ? [sub] : [];
    for (const row of rows) {
      const rec = gstr2AsRecord(row);
      if (!rec) {
        continue;
      }
      txval = addAmounts(txval, rec['txval']);
      iamt = addAmounts(iamt, rec['iamt'] ?? rec['igst']);
    }
  }
  return { taxableValue: txval, igst: iamt };
}

function elgItcTotals(elgitc: Record<string, unknown> | undefined): Gstr3bTaxAmounts {
  if (!elgitc) {
    return { ...ZERO_TAX };
  }
  const subtotals: Record<string, unknown>[] = [];
  for (const v of Object.values(elgitc)) {
    const sec = gstr2AsRecord(v);
    const sub = gstr2AsRecord(sec?.['subtotal']);
    if (sub) {
      subtotals.push(sub);
    }
  }
  return sumTaxRecords(subtotals);
}

export { extractLiabitc } from '@ramsoft-builder/gstr3b/utils/helpers';

export function gstr3bFormatAmount(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '0.00';
  }
  const n = Number.parseFloat(trimmed.replace(/,/g, ''));
  if (!Number.isFinite(n)) {
    return trimmed;
  }
  return n.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function gstr3bDueDateFromRetPeriod(retPeriod: string): string {
  if (!/^\d{6}$/.test(retPeriod)) {
    return '';
  }
  const mm = Number.parseInt(retPeriod.slice(0, 2), 10);
  const yyyy = Number.parseInt(retPeriod.slice(2), 10);
  const d = new Date(yyyy, mm, 1);
  d.setDate(20);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function isGstr3bAutoliabSuccessEnvelope(payload: unknown): boolean {
  const root = gstr2CoercePayloadRoot(payload);
  if (!root) {
    return false;
  }
  if (gstr2StatusIndicatesSuccess(root)) {
    return !!extractLiabitc(payload);
  }
  return !!extractLiabitc(payload);
}

export function gstr3bAutoliabLogicalError(payload: unknown): string | null {
  if (isGstr3bAutoliabSuccessEnvelope(payload)) {
    return null;
  }
  return gstr2LogicalError(payload, 'GSTR-3B auto-liability');
}

export function parseGstr3bAutoliabBundle(payload: unknown): Gstr3bAutoliabBundle | null {
  const root = gstr2CoercePayloadRoot(payload);
  const msg = root ? gstr2MessageRecord(root) : undefined;
  const autopop = gstr2AsRecord(msg?.['r3bautopop'] ?? msg?.['R3bautopop']);
  const liabitc = extractLiabitc(payload);
  if (!liabitc) {
    return null;
  }

  const supDetails = gstr2AsRecord(liabitc['sup_details']);
  const interSup = gstr2AsRecord(liabitc['inter_sup']);
  const elgitc = gstr2AsRecord(liabitc['elgitc']);

  const osup31a = gstr2AsRecord(supDetails?.['osup_3_1a']);
  const osup31b = gstr2AsRecord(supDetails?.['osup_3_1b']);

  const meta: Gstr3bAutoliabMeta = {
    gstin: String(liabitc['gstin'] ?? '').trim().toUpperCase(),
    returnPeriod: String(liabitc['ret_period'] ?? liabitc['retprd'] ?? '').trim(),
    r1FileDate: String(autopop?.['r1fildt'] ?? autopop?.['R1fildt'] ?? '').trim(),
    r2bGenDate: String(autopop?.['r2bgendt'] ?? autopop?.['R2bgendt'] ?? '').trim(),
    r3bGenDate: String(autopop?.['r3bgendt'] ?? autopop?.['R3bgendt'] ?? '').trim(),
  };

  const table5: Gstr3bExemptAmounts = { interState: '0.00', intraState: '0.00' };
  const table51: Gstr3bTaxAmounts = { ...ZERO_TAX };
  const table61: Gstr3bPaymentAmounts = {
    balanceLiability: '0.00',
    paidThroughCash: '0.00',
    paidThroughCredit: '0.00',
  };

  return {
    meta,
    table31: subtotalFromSection(osup31a),
    table311: subtotalFromSection(osup31b),
    table32: interSupSubtotals(interSup),
    table4: elgItcTotals(elgitc),
    table5,
    table51,
    table61,
  };
}
