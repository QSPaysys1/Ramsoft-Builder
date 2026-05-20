import type {
  Gstr2aTdsTcsCreditRow,
  Gstr2aTdsTcsSection,
} from '@ramsoft-builder/gstr1/data-access/gstzen-auth';

export interface Gstr2aTdsTcsPageMeta {
  readonly breadcrumb: string;
  readonly heading: string;
  readonly openFromLabel: string;
  readonly searchPlaceholder: string;
  readonly csvPrefix: string;
  readonly emptyFallback: string;
}

export const GSTR2A_TDS_TCS_PAGE_META: Record<Gstr2aTdsTcsSection, Gstr2aTdsTcsPageMeta> = {
  tds: {
    breadcrumb: 'TDS Credits',
    heading: 'TDS Credits',
    openFromLabel: 'GSTR-2A → TDS Credits',
    searchPlaceholder: 'Deductor GSTIN or amount',
    csvPrefix: 'gstr2a-tds',
    emptyFallback: 'No TDS credit records were returned for this GSTIN and period.',
  },
  tdsa: {
    breadcrumb: 'Amendments to TDS Credits',
    heading: 'Amendments to TDS Credits',
    openFromLabel: 'GSTR-2A → Amendments to TDS Credits',
    searchPlaceholder: 'Deductor GSTIN, month, or original month',
    csvPrefix: 'gstr2a-tdsa',
    emptyFallback: 'No amended TDS credit records were returned for this GSTIN and period.',
  },
  tcs: {
    breadcrumb: 'TCS Credits',
    heading: 'TCS Credits',
    openFromLabel: 'GSTR-2A → TCS Credits',
    searchPlaceholder: 'Collector GSTIN or amount',
    csvPrefix: 'gstr2a-tcs',
    emptyFallback: 'No TCS credit records were returned for this GSTIN and period.',
  },
};

export interface Gstr2aTdsTcsColumnDef {
  readonly id: string;
  readonly label: string;
  readonly field: keyof Gstr2aTdsTcsCreditRow;
  readonly locked?: boolean;
}

export function gstr2aTdsTcsColumnsForSection(
  section: Gstr2aTdsTcsSection,
): readonly Gstr2aTdsTcsColumnDef[] {
  const partyGstinLabel =
    section === 'tcs' ? 'GSTIN of collector' : 'GSTIN of deductor';
  const amountLabel =
    section === 'tcs' ? 'Amount' : 'Amount deducted';

  const cols: Gstr2aTdsTcsColumnDef[] = [
    { id: 'partyGstin', label: partyGstinLabel, field: 'partyGstin', locked: true },
    { id: 'creditMonth', label: 'Month', field: 'creditMonth' },
    { id: 'amount', label: amountLabel, field: 'amount' },
    { id: 'integratedTax', label: 'Integrated tax', field: 'integratedTax' },
    { id: 'centralTax', label: 'Central tax', field: 'centralTax' },
    { id: 'stateTax', label: 'State/UT tax', field: 'stateTax' },
    { id: 'flag', label: 'Flag', field: 'flag' },
  ];

  if (section === 'tdsa') {
    cols.splice(2, 0, {
      id: 'originalPeriod',
      label: 'Original month',
      field: 'originalPeriod',
    });
  }

  return cols;
}
