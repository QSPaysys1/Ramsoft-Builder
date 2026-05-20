import type { Gstr2aEcomaOperatorRow } from './gstr2-ecoma.models';
import {
  gstr2AsRecord,
  gstr2LogicalError,
  gstr2PickField,
  gstr2Str,
} from './gstr2-response.utils';

const ECOMA_SECTION_KEYS = [
  'b2ba',
  'b2ca',
  'urp2ba',
  'urp2ca',
  'b2b',
  'b2c',
  'urp2b',
  'urp2c',
  'eco',
  'documents',
] as const;

const ECOMA_SECTION_LABELS: Record<string, string> = {
  b2ba: 'B2B (Amended)',
  b2ca: 'B2C (Amended)',
  urp2ba: 'URP-2B (Amended)',
  urp2ca: 'URP-2C (Amended)',
  b2b: 'B2B',
  b2c: 'B2C',
  urp2b: 'URP-2B',
  urp2c: 'URP-2C',
  eco: 'ECO',
  documents: 'Documents',
};

function extractEcomaRoot(payload: unknown): Record<string, unknown> | undefined {
  const root = gstr2AsRecord(payload);
  if (!root) {
    return undefined;
  }
  const msg = gstr2AsRecord(root['message']);
  if (msg) {
    const ecoma = gstr2AsRecord(msg['ecoma']) ?? gstr2AsRecord(msg['eco']);
    if (ecoma) {
      return ecoma;
    }
    if (Array.isArray(msg['ecoma'])) {
      return { documents: msg['ecoma'] };
    }
  }
  const direct = gstr2AsRecord(root['ecoma']);
  if (direct) {
    return direct;
  }
  if (Array.isArray(root['ecoma'])) {
    return { documents: root['ecoma'] };
  }
  return root;
}

function countInvoices(raw: Record<string, unknown>): number {
  for (const k of ['inv', 'invoice', 'invoices', 'documents', 'doc'] as const) {
    const v = raw[k];
    if (Array.isArray(v)) {
      return v.length;
    }
  }
  const hasDoc =
    !!raw['inum'] || !!raw['doc_num'] || !!raw['idt'] || !!raw['document_number'];
  return hasDoc ? 1 : 0;
}

function mapOperatorRow(
  raw: Record<string, unknown>,
  sectionKey: string,
  docCount: number,
): Gstr2aEcomaOperatorRow {
  return {
    ecoGstin: gstr2PickField(raw, [
      'rtin',
      'RTIN',
      'stin',
      'STIN',
      'ctin',
      'CTIN',
      'gstin',
      'GSTIN',
      'eco_gstin',
      'operator_gstin',
    ]).toUpperCase(),
    ecoName: gstr2PickField(raw, [
      'cname',
      'trade_name',
      'trdnm',
      'lgnm',
      'legal_name',
      'operator_name',
      'name',
    ]),
    documentCount: docCount,
    documentSection: ECOMA_SECTION_LABELS[sectionKey] ?? sectionKey.toUpperCase(),
    gstr1FilingStatus: gstr2PickField(raw, ['cfs', 'CFS', 'filing_status']),
    gstr1FilingDate: gstr2PickField(raw, ['fldtr1', 'dof', 'filing_date']),
    gstr1FilingPeriod: gstr2PickField(raw, ['flprdr1', 'ret_prd', 'retprd']),
    gstr3bFilingStatus: gstr2PickField(raw, ['cfs3b', 'CFS3B', 'gstr3b_filing_status']),
    cancellationDate: gstr2PickField(raw, ['cxdt', 'dt_canc', 'cancellation_date']),
  };
}

function collectFromSection(
  sectionKey: string,
  items: unknown[],
  out: Map<string, Gstr2aEcomaOperatorRow>,
): void {
  for (const item of items) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      continue;
    }
    const rec = item as Record<string, unknown>;
    const gstin = gstr2PickField(rec, [
      'rtin',
      'stin',
      'ctin',
      'gstin',
      'RTIN',
      'STIN',
      'CTIN',
      'GSTIN',
    ]).toUpperCase();
    const invCount = countInvoices(rec);
    const docCount = invCount > 0 ? invCount : gstin.length === 15 ? 1 : 0;
    if (!gstin && docCount === 0) {
      continue;
    }
    const key = `${gstin || '—'}::${sectionKey}`;
    const mapped = mapOperatorRow(rec, sectionKey, docCount);
    const existing = out.get(key);
    if (!existing) {
      out.set(key, mapped);
      continue;
    }
    out.set(key, {
      ...existing,
      documentCount: existing.documentCount + mapped.documentCount,
      ecoName: existing.ecoName || mapped.ecoName,
    });
  }
}

/**
 * Normalizes GSTZen `POST gstr2/ecoma/` into ECO operator rows.
 */
export function parseGstr2EcomaOperatorsFromPayload(
  payload: unknown,
): Gstr2aEcomaOperatorRow[] {
  const ecomaRoot = extractEcomaRoot(payload);
  if (!ecomaRoot) {
    return [];
  }

  const byKey = new Map<string, Gstr2aEcomaOperatorRow>();

  for (const sectionKey of ECOMA_SECTION_KEYS) {
    const section = ecomaRoot[sectionKey];
    if (Array.isArray(section)) {
      collectFromSection(sectionKey, section, byKey);
      continue;
    }
    if (section && typeof section === 'object' && !Array.isArray(section)) {
      const inner = section as Record<string, unknown>;
      for (const k of ['data', 'list', 'summary', 'operators'] as const) {
        const v = inner[k];
        if (Array.isArray(v)) {
          collectFromSection(sectionKey, v, byKey);
          break;
        }
      }
    }
  }

  if (byKey.size === 0 && Array.isArray(ecomaRoot['list'])) {
    collectFromSection('documents', ecomaRoot['list'] as unknown[], byKey);
  }

  return [...byKey.values()]
    .filter((r) => r.ecoGstin.length === 15 || r.documentCount > 0)
    .sort((a, b) => {
      const g = a.ecoGstin.localeCompare(b.ecoGstin);
      if (g !== 0) {
        return g;
      }
      return a.documentSection.localeCompare(b.documentSection);
    });
}

export function gstr2EcomaLogicalError(payload: unknown): string | null {
  return gstr2LogicalError(payload, 'GSTR-2 ECOMA');
}

export interface Gstr2aEcomaCsvColumn {
  readonly label: string;
  readonly field: keyof Gstr2aEcomaOperatorRow;
}

const GSTR2A_ECOA_CSV_COLUMNS: readonly Gstr2aEcomaCsvColumn[] = [
  { label: 'GSTIN of ECO', field: 'ecoGstin' },
  { label: 'Name of ECO', field: 'ecoName' },
  { label: 'Section', field: 'documentSection' },
  { label: 'No. of documents', field: 'documentCount' },
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

export function gstr2aEcomaRowsToCsv(
  rows: readonly Gstr2aEcomaOperatorRow[],
  columns: readonly Gstr2aEcomaCsvColumn[] = GSTR2A_ECOA_CSV_COLUMNS,
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
