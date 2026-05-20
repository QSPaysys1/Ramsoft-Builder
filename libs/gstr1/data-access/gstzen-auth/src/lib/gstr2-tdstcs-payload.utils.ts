import type {
  Gstr2aTdsTcsBundle,
  Gstr2aTdsTcsCreditRow,
  Gstr2aTdsTcsSection,
} from './gstr2-tdstcs.models';
import {
  gstr2AsRecord,
  gstr2CoercePayloadRoot,
  gstr2MessageRecord,
  gstr2PickField,
  gstr2StatusIndicatesSuccess,
  gstr2Str,
} from './gstr2-response.utils';

const SECTION_ARRAY_KEYS: Record<Gstr2aTdsTcsSection, readonly string[]> = {
  tds: ['tds', 'TDS'],
  tdsa: ['tdsa', 'tds_a', 'TDSA', 'tdsam', 'tds_amend'],
  tcs: ['tcs', 'TCS'],
};

/** Keys that are metadata, not credit line arrays. */
const TDSTCS_NON_ROW_KEYS = new Set([
  'summary',
  'req_time',
  'gstin',
  'ret_period',
  'chksum',
]);

const SECTION_LABELS: Record<Gstr2aTdsTcsSection, string> = {
  tds: 'TDS',
  tdsa: 'TDS (Amended)',
  tcs: 'TCS',
};

const TDSTCS_SECTION_KEYS = [
  'tds',
  'tdsa',
  'tcs',
  'tcsa',
  'tdstcs',
  'tds_tcs',
] as const;

function tdstcsBlockHasSections(block: Record<string, unknown>): boolean {
  for (const key of TDSTCS_SECTION_KEYS) {
    if (block[key] !== undefined) {
      return true;
    }
  }
  return false;
}

function extractTdstcsBlock(
  source: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const block =
    gstr2AsRecord(source['tdstcs']) ??
    gstr2AsRecord(source['tds_tcs']) ??
    gstr2AsRecord(source['tdstc']);
  if (block) {
    return block;
  }
  if (tdstcsBlockHasSections(source)) {
    return source;
  }
  const data = gstr2AsRecord(source['data'] ?? source['Data']);
  if (data) {
    return extractTdstcsBlock(data) ?? (tdstcsBlockHasSections(data) ? data : undefined);
  }
  return undefined;
}

function extractTdstcsRoot(payload: unknown): Record<string, unknown> | undefined {
  const root = gstr2CoercePayloadRoot(payload);
  if (!root) {
    return undefined;
  }
  const msg = gstr2MessageRecord(root);
  if (msg) {
    const fromMsg = extractTdstcsBlock(msg);
    if (fromMsg) {
      return fromMsg;
    }
  }
  const direct = extractTdstcsBlock(root);
  if (direct) {
    return direct;
  }
  return root;
}

function extractSectionArray(
  root: Record<string, unknown>,
  section: Gstr2aTdsTcsSection,
): unknown[] {
  for (const key of SECTION_ARRAY_KEYS[section]) {
    if (TDSTCS_NON_ROW_KEYS.has(key)) {
      continue;
    }
    const v = root[key];
    if (Array.isArray(v)) {
      return v;
    }
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const inner = v as Record<string, unknown>;
      if (inner['accepted'] || inner['rejected']) {
        continue;
      }
      for (const k of ['data', 'list', 'credits', 'details', 'documents'] as const) {
        const nested = inner[k];
        if (Array.isArray(nested)) {
          return nested;
        }
      }
    }
  }
  return [];
}

function pickTdsTcsAmount(
  merged: Record<string, unknown>,
  section: Gstr2aTdsTcsSection,
): string {
  if (section === 'tcs') {
    return gstr2PickField(merged, ['amt', 'amount', 'tcs_amt', 'amt_ded']);
  }
  return gstr2PickField(merged, ['amt_ded', 'amt', 'amount', 'tds_amt', 'tcs_amt']);
}

function mapCreditRow(
  raw: Record<string, unknown>,
  section: Gstr2aTdsTcsSection,
  parent?: Record<string, unknown>,
): Gstr2aTdsTcsCreditRow {
  const merged = parent ? { ...parent, ...raw } : raw;
  const creditMonth = gstr2PickField(merged, [
    'month',
    'ret_period',
    'ret_prd',
    'fp',
  ]);
  const originalPeriod =
    section === 'tdsa'
      ? gstr2PickField(merged, [
          'omonth',
          'omon',
          'orig_month',
          'original_period',
          'org_ret_prd',
        ])
      : '';

  return {
    partyGstin: gstr2PickField(merged, [
      'ctin',
      'CTIN',
      'gstin',
      'GSTIN',
      'gstin_ded',
      'deductor_gstin',
      'col_gstin',
      'collector_gstin',
    ]).toUpperCase(),
    partyName: gstr2PickField(merged, [
      'cname',
      'trade_name',
      'trdnm',
      'lgnm',
      'deductor_name',
      'collector_name',
      'name',
    ]),
    creditSection: SECTION_LABELS[section],
    creditMonth,
    originalPeriod,
    amount: pickTdsTcsAmount(merged, section),
    integratedTax: gstr2PickField(merged, ['iamt', 'igst', 'igst_amt']),
    centralTax: gstr2PickField(merged, ['camt', 'cgst', 'cgst_amt']),
    stateTax: gstr2PickField(merged, ['samt', 'sgst', 'sgst_amt', 'state_ut_tax']),
    cess: gstr2PickField(merged, ['csamt', 'cess']),
    flag: gstr2PickField(merged, ['flag', 'Flag', 'action']),
    placeOfSupply: gstr2PickField(merged, ['pos', 'place_of_supply']),
    gstr1FilingStatus: gstr2PickField(merged, ['cfs', 'CFS', 'filing_status']),
    gstr1FilingDate: gstr2PickField(merged, ['fldtr1', 'dof', 'filing_date']),
    gstr3bFilingStatus: gstr2PickField(merged, ['cfs3b', 'CFS3B', 'gstr3b_filing_status']),
  };
}

function isTdsTcsCreditRow(mapped: Gstr2aTdsTcsCreditRow): boolean {
  if (mapped.partyGstin.length === 15) {
    return true;
  }
  return !!(
    mapped.creditMonth ||
    mapped.amount ||
    mapped.integratedTax ||
    mapped.centralTax ||
    mapped.stateTax
  );
}

function flattenSectionItems(
  items: unknown[],
  section: Gstr2aTdsTcsSection,
): Gstr2aTdsTcsCreditRow[] {
  const out: Gstr2aTdsTcsCreditRow[] = [];

  for (const item of items) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      continue;
    }
    const rec = item as Record<string, unknown>;
    const detailBuckets = [
      rec['tdsded'],
      rec['tcsded'],
      rec['tdsdet'],
      rec['tcsdet'],
      rec['det'],
      rec['details'],
      rec['doc'],
      rec['docs'],
      rec['documents'],
      rec['inv'],
      rec['credit'],
      rec['credits'],
      rec['itms'],
      rec['items'],
    ];
    let expanded = false;
    for (const bucket of detailBuckets) {
      if (!Array.isArray(bucket) || bucket.length === 0) {
        continue;
      }
      expanded = true;
      for (const row of bucket) {
        if (row && typeof row === 'object' && !Array.isArray(row)) {
          out.push(mapCreditRow(row as Record<string, unknown>, section, rec));
        }
      }
    }
    if (!expanded) {
      const mapped = mapCreditRow(rec, section);
      if (isTdsTcsCreditRow(mapped)) {
        out.push(mapped);
      }
    }
  }

  return out;
}

function dedupeRows(rows: Gstr2aTdsTcsCreditRow[]): Gstr2aTdsTcsCreditRow[] {
  const seen = new Set<string>();
  const unique: Gstr2aTdsTcsCreditRow[] = [];
  for (const row of rows) {
    const key = [
      row.partyGstin,
      row.creditSection,
      row.creditMonth,
      row.originalPeriod,
      row.amount,
      row.integratedTax,
      row.centralTax,
      row.stateTax,
      row.flag,
    ].join('::');
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(row);
  }
  return unique.sort((a, b) => {
    const g = a.partyGstin.localeCompare(b.partyGstin);
    if (g !== 0) {
      return g;
    }
    const m = a.creditMonth.localeCompare(b.creditMonth);
    if (m !== 0) {
      return m;
    }
    return a.originalPeriod.localeCompare(b.originalPeriod);
  });
}

export function gstr2aTdsTcsRowKey(row: Gstr2aTdsTcsCreditRow): string {
  return [
    row.partyGstin,
    row.creditSection,
    row.creditMonth,
    row.originalPeriod,
    row.amount,
  ].join('::');
}

export function parseGstr2TdsTcsBundle(payload: unknown): Gstr2aTdsTcsBundle {
  const root = extractTdstcsRoot(payload);
  if (!root) {
    return { tds: [], tdsa: [], tcs: [] };
  }

  const tds = dedupeRows(flattenSectionItems(extractSectionArray(root, 'tds'), 'tds'));
  const tdsa = dedupeRows(
    flattenSectionItems(extractSectionArray(root, 'tdsa'), 'tdsa'),
  );
  const tcs = dedupeRows(flattenSectionItems(extractSectionArray(root, 'tcs'), 'tcs'));

  return { tds, tdsa, tcs };
}

export function parseGstr2TdsTcsSectionFromPayload(
  payload: unknown,
  section: Gstr2aTdsTcsSection,
): readonly Gstr2aTdsTcsCreditRow[] {
  return parseGstr2TdsTcsBundle(payload)[section];
}

export function isGstr2TdstcsSuccessEnvelope(payload: unknown): boolean {
  const root = gstr2CoercePayloadRoot(payload);
  if (!root) {
    return false;
  }
  if (gstr2StatusIndicatesSuccess(root)) {
    return true;
  }
  const block = extractTdstcsRoot(payload);
  return !!block && tdstcsBlockHasSections(block);
}

export function gstr2TdstcsLogicalError(payload: unknown): string | null {
  if (isGstr2TdstcsSuccessEnvelope(payload)) {
    return null;
  }
  const root = gstr2CoercePayloadRoot(payload);
  if (!root) {
    if (typeof payload === 'string' && payload.trim()) {
      return payload.trim();
    }
    return 'Unexpected response from GSTR-2 TDS/TCS.';
  }
  const err =
    root['error'] ??
    root['Error'] ??
    root['detail'] ??
    (gstr2MessageRecord(root)?.['error'] ?? gstr2MessageRecord(root)?.['Error']);
  if (typeof err === 'string' && err.trim()) {
    return err.trim();
  }
  const msgRaw = root['message'] ?? root['Message'];
  if (typeof msgRaw === 'string' && msgRaw.trim()) {
    return msgRaw.trim();
  }
  if (!gstr2StatusIndicatesSuccess(root) && !extractTdstcsRoot(payload)) {
    return 'GSTR-2 TDS/TCS request did not return a success status.';
  }
  return null;
}

export interface Gstr2aTdsTcsCsvColumn {
  readonly label: string;
  readonly field: keyof Gstr2aTdsTcsCreditRow;
}

const GSTR2A_TDSTCS_CSV_COLUMNS: readonly Gstr2aTdsTcsCsvColumn[] = [
  { label: 'GSTIN', field: 'partyGstin' },
  { label: 'Name', field: 'partyName' },
  { label: 'Section', field: 'creditSection' },
  { label: 'Month', field: 'creditMonth' },
  { label: 'Original month', field: 'originalPeriod' },
  { label: 'Amount', field: 'amount' },
  { label: 'Integrated tax', field: 'integratedTax' },
  { label: 'Central tax', field: 'centralTax' },
  { label: 'State/UT tax', field: 'stateTax' },
  { label: 'Cess', field: 'cess' },
  { label: 'Flag', field: 'flag' },
];

export function gstr2aTdsTcsRowsToCsv(
  rows: readonly Gstr2aTdsTcsCreditRow[],
  columns: readonly Gstr2aTdsTcsCsvColumn[] = GSTR2A_TDSTCS_CSV_COLUMNS,
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
