import type { Gstr2bItcTab } from './gstr2-2b.models';

export interface Gstr2bSummaryLeafDef {
  readonly key: string;
  readonly label: string;
}

export interface Gstr2bSummaryGroupDef {
  readonly id: string;
  readonly path: readonly string[];
  readonly heading: string;
  readonly gstr3bTable: string;
  readonly children: readonly Gstr2bSummaryLeafDef[];
}

export interface Gstr2bSummaryPartDef {
  readonly heading: string;
}

export interface Gstr2bItcTabLayout {
  readonly partA: Gstr2bSummaryPartDef;
  readonly groups: readonly Gstr2bSummaryGroupDef[];
  readonly partB?: Gstr2bSummaryPartDef;
  readonly partBGroups?: readonly Gstr2bSummaryGroupDef[];
}

const B2B_ECOM_CHILDREN: readonly Gstr2bSummaryLeafDef[] = [
  { key: 'b2b', label: 'B2B - Invoices' },
  { key: 'b2ba', label: 'B2B - Invoices (Amendment)' },
  { key: 'cdnr', label: 'B2B - Debit notes' },
  { key: 'cdnra', label: 'B2B - Debit notes (Amendment)' },
  { key: 'ecom', label: 'ECO - Documents' },
  { key: 'ecoma', label: 'ECO - Documents (Amendment)' },
];

const B2B_REV_CHILDREN: readonly Gstr2bSummaryLeafDef[] = [
  { key: 'b2b', label: 'B2B - Invoices' },
  { key: 'b2ba', label: 'B2B - Invoices (Amendment)' },
  { key: 'cdnr', label: 'B2B - Debit notes' },
  { key: 'cdnra', label: 'B2B - Debit notes (Amendment)' },
];

const ISD_CHILDREN: readonly Gstr2bSummaryLeafDef[] = [
  { key: 'isd', label: 'ISD - Invoices' },
  { key: 'isda', label: 'ISD - Invoices (Amendment)' },
];

const IMPORT_CHILDREN: readonly Gstr2bSummaryLeafDef[] = [
  { key: 'impg', label: 'Import of Goods from overseas on bill of entry' },
  { key: 'impgsez', label: 'Import of Goods from SEZ on bill of entry' },
  { key: 'impga', label: 'Import of Goods from overseas (Amendment)' },
  { key: 'impgasez', label: 'Import of Goods from SEZ (Amendment)' },
];

const OTHERSUP_CHILDREN: readonly Gstr2bSummaryLeafDef[] = [
  { key: 'cdnr', label: 'B2B - Credit notes' },
  { key: 'cdnra', label: 'B2B - Credit notes (Amendment)' },
  { key: 'cdnrrev', label: 'B2B - Credit notes (Reverse charge)' },
  { key: 'cdnrarev', label: 'B2B - Credit notes (Amendment) (Reverse charge)' },
  { key: 'isd', label: 'ISD - Credit notes' },
  { key: 'isda', label: 'ISD - Credit notes (Amendment)' },
];

export const GSTR2B_ITC_AVL_LAYOUT: Gstr2bItcTabLayout = {
  partA: {
    heading:
      'Part A: ITC Available - Credit may be claimed in relevant heading in GSTR-3B',
  },
  groups: [
    {
      id: 'nonrevsup',
      path: ['nonrevsup'],
      heading: 'I. All other ITC - Supplies from registered persons',
      gstr3bTable: '4(A)(5)',
      children: B2B_ECOM_CHILDREN,
    },
    {
      id: 'isdsup',
      path: ['isdsup'],
      heading: 'II. Inward Supplies from ISD',
      gstr3bTable: '4(A)(4)',
      children: ISD_CHILDREN,
    },
    {
      id: 'revsup',
      path: ['revsup'],
      heading: 'III. Inward Supplies liable for reverse charge',
      gstr3bTable: '4(A)(3)',
      children: B2B_REV_CHILDREN,
    },
    {
      id: 'imports',
      path: ['imports'],
      heading: 'IV. Import of Goods',
      gstr3bTable: '4(A)(1) & 4(A)(2)',
      children: IMPORT_CHILDREN,
    },
  ],
  partB: {
    heading:
      'Part B: ITC Available - Credit notes should be net off against relevant ITC available headings in GSTR-3B',
  },
  partBGroups: [
    {
      id: 'othersup',
      path: ['othersup'],
      heading: 'I. Others',
      gstr3bTable: '4(B)(2)',
      children: OTHERSUP_CHILDREN,
    },
  ],
};

export const GSTR2B_ITC_UNAVL_LAYOUT: Gstr2bItcTabLayout = {
  partA: { heading: 'Part A: ITC Not Available' },
  groups: [
    {
      id: 'nonrevsup',
      path: ['nonrevsup'],
      heading: 'I. All other ITC - Supplies from registered persons',
      gstr3bTable: '4(D)(2)',
      children: B2B_ECOM_CHILDREN,
    },
    {
      id: 'isdsup',
      path: ['isdsup'],
      heading: 'II. Inward Supplies from ISD',
      gstr3bTable: '3.1(d)',
      children: ISD_CHILDREN,
    },
    {
      id: 'revsup',
      path: ['revsup'],
      heading: 'III. Inward Supplies liable for reverse charge',
      gstr3bTable: '3.1(d)',
      children: B2B_REV_CHILDREN,
    },
    {
      id: 'imports',
      path: ['imports'],
      heading: 'IV. Import of Goods',
      gstr3bTable: '3.1(d)',
      children: IMPORT_CHILDREN,
    },
  ],
  partB: {
    heading:
      'Part B: ITC Not Available - Credit notes should be net off from ITC available for reversal',
  },
  partBGroups: [
    {
      id: 'othersup',
      path: ['othersup'],
      heading: 'I. Others',
      gstr3bTable: '4(B)(2)',
      children: OTHERSUP_CHILDREN,
    },
  ],
};

export const GSTR2B_ITC_REV_LAYOUT: Gstr2bItcTabLayout = {
  partA: { heading: 'Part A: ITC Reversed - Others' },
  groups: [
    {
      id: 'nonrevsup',
      path: ['nonrevsup'],
      heading: 'ITC Reversal on account of Rule 37A',
      gstr3bTable: '4(B)(2)',
      children: B2B_REV_CHILDREN,
    },
    {
      id: 'isdsup',
      path: ['isdsup'],
      heading: 'Inward Supplies from ISD',
      gstr3bTable: '—',
      children: ISD_CHILDREN,
    },
    {
      id: 'imports',
      path: ['imports'],
      heading: 'Import of Goods',
      gstr3bTable: '—',
      children: IMPORT_CHILDREN,
    },
    {
      id: 'othersup',
      path: ['othersup'],
      heading: 'Others',
      gstr3bTable: '4(B)(2)',
      children: OTHERSUP_CHILDREN,
    },
  ],
};

const B2B_IMS_CHILDREN: readonly Gstr2bSummaryLeafDef[] = [
  { key: 'b2b', label: 'B2B - Invoices - IMS' },
  { key: 'cdnr', label: 'B2B - Debit notes - IMS' },
  { key: 'ecom', label: 'ECO - Documents - IMS' },
  { key: 'b2ba', label: 'B2B - Invoices (Amendment) - IMS' },
  { key: 'cdnra', label: 'B2B - Debit notes (Amendment) - IMS' },
  { key: 'ecoma', label: 'ECO - Documents (Amendment) - IMS' },
];

export const GSTR2B_ITC_REJ_LAYOUT: Gstr2bItcTabLayout = {
  partA: { heading: 'Part A: ITC Rejected' },
  groups: [
    {
      id: 'nonrevsup',
      path: ['nonrevsup'],
      heading: 'I. All other ITC - Supplies from registered persons (IMS)',
      gstr3bTable: 'NA',
      children: B2B_IMS_CHILDREN,
    },
    {
      id: 'isdsup',
      path: ['isdsup'],
      heading: 'II. Inward Supplies from ISD',
      gstr3bTable: 'NA',
      children: ISD_CHILDREN,
    },
  ],
  partB: {
    heading:
      'Part B: Rejected Records - Credit Notes rejected on IMS Dashboard',
  },
  partBGroups: [
    {
      id: 'othersup',
      path: ['othersup'],
      heading: 'I. Others (IMS)',
      gstr3bTable: 'NA',
      children: [
        { key: 'cdnr', label: 'B2B - Credit notes - IMS' },
        { key: 'cdnra', label: 'B2B - Credit notes (Amendment) - IMS' },
        { key: 'isd', label: 'ISD - Credit notes' },
        { key: 'isda', label: 'ISD - Credit notes (Amendment)' },
      ],
    },
  ],
};

export const GSTR2B_ITC_TAB_LAYOUTS: Record<Gstr2bItcTab, Gstr2bItcTabLayout> = {
  itcavl: GSTR2B_ITC_AVL_LAYOUT,
  itcunavl: GSTR2B_ITC_UNAVL_LAYOUT,
  itcrev: GSTR2B_ITC_REV_LAYOUT,
  itcrej: GSTR2B_ITC_REJ_LAYOUT,
};

export const GSTR2B_ITC_TAB_LABELS: Record<Gstr2bItcTab, string> = {
  itcavl: 'ITC available',
  itcunavl: 'ITC Not Available',
  itcrev: 'ITC Reversal',
  itcrej: 'ITC Rejected',
};

export const GSTR2B_ITC_TABS: readonly Gstr2bItcTab[] = [
  'itcavl',
  'itcunavl',
  'itcrev',
  'itcrej',
];

/** Portal-style info banners shown above the summary table per ITC tab. */
export const GSTR2B_ITC_TAB_ADVISORIES: Partial<Record<Gstr2bItcTab, string>> = {
  itcrev:
    'Data will be available in GSTR-2B of September month.',
};

export interface Gstr2bCpTableOption {
  readonly id: string;
  readonly label: string;
  readonly cpSummKey: string;
}

export const GSTR2B_CP_TABLE_OPTIONS: readonly Gstr2bCpTableOption[] = [
  {
    id: 'b2b',
    label: 'Taxable inward supplies received from registered person - B2B',
    cpSummKey: 'b2b',
  },
  {
    id: 'b2ba',
    label: 'Amendments to taxable inward supplies - B2B',
    cpSummKey: 'b2ba',
  },
  { id: 'cdnr', label: 'Debit notes from registered persons', cpSummKey: 'cdnr' },
  { id: 'cdnra', label: 'Amendments to debit notes', cpSummKey: 'cdnra' },
  { id: 'isd', label: 'ISD credits', cpSummKey: 'isd' },
  { id: 'isda', label: 'Amendments to ISD credits', cpSummKey: 'isda' },
  { id: 'impgsez', label: 'Import of goods from SEZ', cpSummKey: 'impgsez' },
  { id: 'ecom', label: 'ECO documents', cpSummKey: 'ecom' },
  { id: 'ecoma', label: 'Amendments to ECO documents', cpSummKey: 'ecoma' },
];
