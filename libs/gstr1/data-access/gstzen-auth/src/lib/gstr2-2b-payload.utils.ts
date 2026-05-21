import type {
  Gstr2bBundle,
  Gstr2bCpSummRow,
  Gstr2bDocRow,
  Gstr2bHeaderMeta,
  Gstr2bItcTab,
  Gstr2bSummaryRow,
  Gstr2bTaxAmounts,
} from './gstr2-2b.models';
import {
  GSTR2B_ITC_TAB_LAYOUTS,
  type Gstr2bItcTabLayout,
  type Gstr2bSummaryGroupDef,
} from './gstr2b-summary.constants';
import {
  gstr2AsRecord,
  gstr2CoercePayloadRoot,
  gstr2LogicalError,
  gstr2MessageRecord,
  gstr2PickField,
  gstr2StatusIndicatesSuccess,
  gstr2Str,
} from './gstr2-response.utils';

const TAX_KEYS = ['igst', 'cgst', 'sgst', 'cess'] as const;

function formatTaxAmount(v: unknown): string {
  if (v === null || v === undefined || v === '') {
    return '0.00';
  }
  const n =
    typeof v === 'number'
      ? v
      : Number.parseFloat(typeof v === 'string' ? v.trim() : String(v));
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}

function taxFromRecord(raw: Record<string, unknown> | undefined): Gstr2bTaxAmounts {
  if (!raw) {
    return { igst: '0.00', cgst: '0.00', sgst: '0.00', cess: '0.00' };
  }
  return {
    igst: formatTaxAmount(raw['igst'] ?? raw['iamt']),
    cgst: formatTaxAmount(raw['cgst'] ?? raw['camt']),
    sgst: formatTaxAmount(raw['sgst'] ?? raw['samt']),
    cess: formatTaxAmount(raw['cess'] ?? raw['csamt']),
  };
}

/** Indian-style amount for summary table cells. */
export function gstr2bFormatSummaryAmount(value: string): string {
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

const ITC_TAB_KEY_ALIASES: Record<string, Gstr2bItcTab> = {
  itcavl: 'itcavl',
  itc_avl: 'itcavl',
  itcavailable: 'itcavl',
  itc_available: 'itcavl',
  itcunavl: 'itcunavl',
  itc_unavl: 'itcunavl',
  itcnotavailable: 'itcunavl',
  itc_not_available: 'itcunavl',
  itcrev: 'itcrev',
  itc_rev: 'itcrev',
  itcreversal: 'itcrev',
  itc_reversal: 'itcrev',
  itcrej: 'itcrej',
  itc_rej: 'itcrej',
  itcrejected: 'itcrej',
  itc_rejected: 'itcrej',
};

function normalizeItcSummKeys(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    const tab = ITC_TAB_KEY_ALIASES[key.trim().toLowerCase()];
    if (tab) {
      out[tab] = value;
    }
  }
  return Object.keys(out).length > 0 ? out : raw;
}

function resolveItcTabRoot(
  itcSumm: Record<string, unknown>,
  tab: Gstr2bItcTab,
): Record<string, unknown> | undefined {
  const direct = gstr2AsRecord(itcSumm[tab]);
  if (direct) {
    return direct;
  }
  for (const [key, value] of Object.entries(itcSumm)) {
    if (ITC_TAB_KEY_ALIASES[key.trim().toLowerCase()] === tab) {
      return gstr2AsRecord(value);
    }
  }
  return undefined;
}

function unwrapGstr2bStatementData(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const inner = gstr2AsRecord(data['data']);
  if (
    inner &&
    (gstr2PickField(inner, ['gstin', 'GSTIN']) ||
      inner['itcsumm'] ||
      inner['cpsumm'] ||
      inner['docdata'])
  ) {
    return { ...data, ...inner };
  }
  return data;
}

function isTaxBucket(obj: Record<string, unknown>): boolean {
  return (
    TAX_KEYS.some((k) => obj[k] !== undefined) ||
    obj['iamt'] !== undefined ||
    obj['camt'] !== undefined ||
    obj['samt'] !== undefined ||
    obj['csamt'] !== undefined
  );
}

function lookupTaxBucket(
  root: Record<string, unknown> | undefined,
  path: readonly string[],
): Gstr2bTaxAmounts {
  if (!root) {
    return taxFromRecord(undefined);
  }
  let cur: Record<string, unknown> | undefined = root;
  for (const segment of path) {
    if (!cur) {
      return taxFromRecord(undefined);
    }
    const next = cur[segment];
    if (!next || typeof next !== 'object' || Array.isArray(next)) {
      return taxFromRecord(undefined);
    }
    cur = next as Record<string, unknown>;
  }
  return taxFromRecord(cur);
}

function extractGstr2bDataRoot(payload: unknown): Record<string, unknown> | undefined {
  const root = gstr2CoercePayloadRoot(payload);
  if (!root) {
    return undefined;
  }
  const msg = gstr2MessageRecord(root);
  if (msg) {
    let data = gstr2AsRecord(msg['data']);
    if (data) {
      return unwrapGstr2bStatementData(data);
    }
    return msg;
  }
  const topData = gstr2AsRecord(root['data']);
  if (topData) {
    return unwrapGstr2bStatementData(topData);
  }
  return root;
}

export function parseGstr2bBundle(payload: unknown): Gstr2bBundle | null {
  const data = extractGstr2bDataRoot(payload);
  if (!data) {
    return null;
  }
  const itcSummRaw =
    gstr2AsRecord(data['itcsumm']) ??
    gstr2AsRecord(data['itc_summ']) ??
    gstr2AsRecord(data['ItcSumm']) ??
    {};
  const itcSumm = normalizeItcSummKeys(itcSummRaw);
  const cpSumm =
    gstr2AsRecord(data['cpsumm']) ??
    gstr2AsRecord(data['cp_summ']) ??
    gstr2AsRecord(data['CpSumm']) ??
    {};
  const docData =
    gstr2AsRecord(data['docdata']) ??
    gstr2AsRecord(data['doc_data']) ??
    gstr2AsRecord(data['DocData']) ??
    {};

  return {
    header: {
      gstin: gstr2PickField(data, ['gstin', 'GSTIN']),
      returnPeriod: gstr2PickField(data, ['rtnprd', 'ret_period', 'retprd']),
      generationDate: gstr2PickField(data, ['gendt', 'gen_dt', 'generation_date']),
      version: gstr2PickField(data, ['version', 'ver']),
    },
    itcSumm,
    cpSumm,
    docData,
  };
}

function pushSummaryRow(
  rows: Gstr2bSummaryRow[],
  opts: {
    id: string;
    serial: string;
    heading: string;
    gstr3bTable: string;
    depth: number;
    isPartHeader: boolean;
    isExpandable: boolean;
    parentId: string | null;
    tax: Gstr2bTaxAmounts;
  },
): void {
  rows.push({
    id: opts.id,
    serial: opts.serial,
    heading: opts.heading,
    gstr3bTable: opts.gstr3bTable,
    depth: opts.depth,
    isPartHeader: opts.isPartHeader,
    isExpandable: opts.isExpandable,
    parentId: opts.parentId,
    igst: opts.tax.igst,
    cgst: opts.tax.cgst,
    sgst: opts.tax.sgst,
    cess: opts.tax.cess,
  });
}

function appendGroupRows(
  rows: Gstr2bSummaryRow[],
  tab: Gstr2bItcTab,
  tabRoot: Record<string, unknown> | undefined,
  group: Gstr2bSummaryGroupDef,
  serialPrefix: string,
  groupIndex: number,
): void {
  const groupId = `${tab}-${group.id}`;
  const groupTax = lookupTaxBucket(tabRoot, group.path);
  pushSummaryRow(rows, {
    id: groupId,
    serial: String(groupIndex),
    heading: group.heading,
    gstr3bTable: group.gstr3bTable,
    depth: 1,
    isPartHeader: false,
    isExpandable: group.children.length > 0,
    parentId: `${tab}-part-a`,
    tax: groupTax,
  });

  let leafIdx = 1;
  for (const child of group.children) {
    const leafPath = [...group.path, child.key];
    pushSummaryRow(rows, {
      id: `${groupId}-${child.key}`,
      serial: `${groupIndex}.${leafIdx}`,
      heading: child.label,
      gstr3bTable: '',
      depth: 2,
      isPartHeader: false,
      isExpandable: false,
      parentId: groupId,
      tax: lookupTaxBucket(tabRoot, leafPath),
    });
    leafIdx += 1;
  }
}

function buildSummaryRowsForTab(
  itcSumm: Record<string, unknown>,
  tab: Gstr2bItcTab,
): Gstr2bSummaryRow[] {
  const layout: Gstr2bItcTabLayout = GSTR2B_ITC_TAB_LAYOUTS[tab];
  const tabRoot = resolveItcTabRoot(itcSumm, tab);
  const rows: Gstr2bSummaryRow[] = [];

  pushSummaryRow(rows, {
    id: `${tab}-part-a`,
    serial: '',
    heading: layout.partA.heading,
    gstr3bTable: '',
    depth: 0,
    isPartHeader: true,
    isExpandable: false,
    parentId: null,
    tax: { igst: '', cgst: '', sgst: '', cess: '' },
  });

  layout.groups.forEach((group, idx) => {
    appendGroupRows(rows, tab, tabRoot, group, '', idx + 1);
  });

  if (layout.partB && layout.partBGroups?.length) {
    pushSummaryRow(rows, {
      id: `${tab}-part-b`,
      serial: '',
      heading: layout.partB.heading,
      gstr3bTable: '',
      depth: 0,
      isPartHeader: true,
      isExpandable: false,
      parentId: null,
      tax: { igst: '', cgst: '', sgst: '', cess: '' },
    });
    layout.partBGroups.forEach((group, idx) => {
      appendGroupRows(rows, tab, tabRoot, group, 'b', idx + 1);
    });
  }

  return rows;
}

export function gstr2bSummaryRowsForTab(
  bundle: Gstr2bBundle,
  tab: Gstr2bItcTab,
): readonly Gstr2bSummaryRow[] {
  return buildSummaryRowsForTab(bundle.itcSumm, tab);
}

function mapCpSummRow(raw: Record<string, unknown>): Gstr2bCpSummRow {
  return {
    supplierGstin: gstr2PickField(raw, ['ctin', 'CTIN', 'gstin']).toUpperCase(),
    tradeName: gstr2PickField(raw, ['trdnm', 'trade_name', 'lgnm']),
    supplyPeriod: gstr2PickField(raw, ['supprd', 'sup_period']),
    filingDate: gstr2PickField(raw, ['supfildt', 'filing_date']),
    totalDocs: gstr2PickField(raw, ['ttldocs', 'total_docs']),
    taxableValue: gstr2PickField(raw, ['txval', 'taxable_value']),
    integratedTax: formatTaxAmount(raw['igst']),
    centralTax: formatTaxAmount(raw['cgst']),
    stateTax: formatTaxAmount(raw['sgst']),
    cess: formatTaxAmount(raw['cess']),
    noteType: gstr2PickField(raw, ['nttyp', 'note_type']),
    documentType: gstr2PickField(raw, ['doctyp', 'doc_type']),
    portCode: gstr2PickField(raw, ['portcode', 'port_code', 'portcd']),
  };
}

const INV_TYPE_LABELS: Record<string, string> = {
  R: 'Regular',
  DE: 'Deemed Exports',
  SEWP: 'SEZ supplies with payment',
  SEWOP: 'SEZ supplies without payment',
  CBW: 'Custom Bonded Warehouse',
};

function formatInvType(code: string): string {
  const c = code.trim().toUpperCase();
  return INV_TYPE_LABELS[c] ?? (code.trim() || '—');
}

function formatYesNo(code: string): string {
  const c = code.trim().toUpperCase();
  if (c === 'Y') {
    return 'Yes';
  }
  if (c === 'N') {
    return 'No';
  }
  return code.trim() || '—';
}

function mapDocRow(
  raw: Record<string, unknown>,
  parent?: Record<string, unknown>,
): Gstr2bDocRow {
  const merged = parent ? { ...parent, ...raw } : raw;
  const invTypCode = gstr2PickField(merged, [
    'typ',
    'inv_typ',
    'invoice_type',
    'invtp',
  ]);
  const revCode = gstr2PickField(merged, [
    'rchrg',
    'reverse_charge',
    'rev_charge',
    'sup_attr_rc',
  ]);
  const itcCode = gstr2PickField(merged, [
    'itcavl',
    'itc_avl',
    'itc_availability',
    'itc_availability_status',
  ]);
  return {
    supplierGstin: gstr2PickField(merged, ['ctin', 'CTIN', 'gstin']).toUpperCase(),
    tradeName: gstr2PickField(merged, ['trdnm', 'trade_name', 'lgnm', 'cname']),
    invoiceNumber: gstr2PickField(merged, [
      'inum',
      'inv_num',
      'invoice_number',
      'doc_num',
      'nt_num',
    ]),
    invoiceType: formatInvType(invTypCode),
    invoiceTypeCode: invTypCode.trim().toUpperCase(),
    invoiceDate: gstr2PickField(merged, ['dt', 'idt', 'inv_dt', 'invoice_date']),
    invoiceValue: formatTaxAmount(merged['val'] ?? merged['inv_val'] ?? merged['invoice_value']),
    placeOfSupply: gstr2PickField(merged, ['pos', 'place_of_supply']),
    reverseCharge: formatYesNo(revCode),
    reverseChargeCode: revCode.trim().toUpperCase(),
    taxableValue: formatTaxAmount(merged['txval'] ?? merged['taxable_value']),
    integratedTax: formatTaxAmount(merged['igst'] ?? merged['iamt']),
    centralTax: formatTaxAmount(merged['cgst'] ?? merged['camt']),
    stateTax: formatTaxAmount(merged['sgst'] ?? merged['samt']),
    cess: formatTaxAmount(merged['cess'] ?? merged['csamt']),
    gstr1FilingPeriod: gstr2PickField(merged, [
      'supprd',
      'sup_period',
      'flprdr1',
      'ret_prd',
      'retprd',
    ]),
    gstr1FilingDate: gstr2PickField(merged, [
      'supfildt',
      'filing_date',
      'fldtr1',
      'dof',
    ]),
    itcAvailability: formatYesNo(itcCode),
    itcAvailabilityCode: itcCode.trim().toUpperCase(),
    reason: gstr2PickField(merged, ['rsn', 'reason']),
    source: gstr2PickField(merged, ['srctyp', 'src', 'source']),
    taxRatePercent: gstr2PickField(merged, ['rt', 'rate', 'tax_rate']),
    irn: gstr2PickField(merged, ['irn', 'IRN']),
    irnDate: gstr2PickField(merged, ['irngendate', 'irn_date', 'irn_dt']),
  };
}

function flattenDocRows(items: unknown[]): Gstr2bDocRow[] {
  const out: Gstr2bDocRow[] = [];
  for (const item of items) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      continue;
    }
    const rec = item as Record<string, unknown>;
    const invBuckets = [
      'inv',
      'invoice',
      'invoices',
      'nt',
      'notes',
      'doc',
      'documents',
    ] as const;
    let nested = false;
    for (const k of invBuckets) {
      const v = rec[k];
      if (!Array.isArray(v)) {
        continue;
      }
      nested = true;
      for (const inv of v) {
        if (inv && typeof inv === 'object' && !Array.isArray(inv)) {
          out.push(mapDocRow(inv as Record<string, unknown>, rec));
        }
      }
    }
    if (!nested) {
      const hasDoc =
        !!gstr2PickField(rec, ['inum', 'inv_num', 'nt_num', 'doc_num']) ||
        !!gstr2PickField(rec, ['dt', 'idt', 'inv_dt']);
      if (hasDoc) {
        out.push(mapDocRow(rec));
      }
    }
  }
  return out;
}

export function gstr2bDocRowsForTable(
  bundle: Gstr2bBundle,
  docDataKey: string,
): readonly Gstr2bDocRow[] {
  const raw = bundle.docData[docDataKey];
  if (Array.isArray(raw)) {
    return flattenDocRows(raw);
  }
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const rec = raw as Record<string, unknown>;
    for (const k of ['data', 'list', 'suppliers', 'inv'] as const) {
      const v = rec[k];
      if (Array.isArray(v)) {
        return flattenDocRows(v);
      }
    }
    return flattenDocRows([rec]);
  }
  return [];
}

export function gstr2bCpSummRowsForTable(
  bundle: Gstr2bBundle,
  cpSummKey: string,
): readonly Gstr2bCpSummRow[] {
  const raw = bundle.cpSumm[cpSummKey];
  if (Array.isArray(raw)) {
    return raw
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      .map((item) => mapCpSummRow(item));
  }
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const rec = raw as Record<string, unknown>;
    if (cpSummKey === 'itcrev') {
      const out: Gstr2bCpSummRow[] = [];
      for (const [k, v] of Object.entries(rec)) {
        if (v && typeof v === 'object' && !Array.isArray(v) && isTaxBucket(v as Record<string, unknown>)) {
          out.push(mapCpSummRow({ ...v, doctyp: k } as Record<string, unknown>));
        }
      }
      return out;
    }
    return [mapCpSummRow(rec)];
  }
  return [];
}

export function isGstr22bSuccessEnvelope(payload: unknown): boolean {
  const root = gstr2CoercePayloadRoot(payload);
  if (!root) {
    return false;
  }
  if (gstr2StatusIndicatesSuccess(root)) {
    return true;
  }
  return !!extractGstr2bDataRoot(payload);
}

export function gstr22bLogicalError(payload: unknown): string | null {
  if (isGstr22bSuccessEnvelope(payload)) {
    return null;
  }
  return gstr2LogicalError(payload, 'GSTR-2B');
}

export function gstr2bHasSummaryData(bundle: Gstr2bBundle, tab: Gstr2bItcTab): boolean {
  const rows = gstr2bSummaryRowsForTab(bundle, tab);
  return rows.some(
    (r) =>
      !r.isPartHeader &&
      (Number.parseFloat(r.igst) > 0 ||
        Number.parseFloat(r.cgst) > 0 ||
        Number.parseFloat(r.sgst) > 0 ||
        Number.parseFloat(r.cess) > 0),
  );
}
