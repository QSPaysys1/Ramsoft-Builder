import type { Gstr1DownloadApiName } from '@ramsoft-builder/gstr1/data-access/gstzen-auth';

/** Portal section titles — same order as GST return workspace. */
export const GSTR1_SUMMARY_SECTION_TITLES: readonly string[] = [
  '4A, 4B, 6B, 6C - B2B, SEZ, DE Invoices',
  '5 - B2C (Large) Invoices',
  '6A - Exports Invoices',
  '7 - B2C (Others)',
  '8A, 8B, 8C, 8D - Nil Rated Supplies',
  '9B - Credit / Debit Notes (Registered)',
  '9B - Credit / Debit Notes (Unregistered)',
  '11A(1), 11A(2) - Tax Liability (Advances Received)',
  '11B(1), 11B(2) - Adjustment of Advances',
  '12 - HSN-wise summary of outward supplies',
  '13 - Documents Issued',
  '14 - Supplies made through ECO',
  '15 - Supplies U/s 9(5)',
];

/**
 * Maps GSTZen `api_name` to summary tile indexes in {@link GSTR1_SUMMARY_SECTION_TITLES}.
 */
export const GSTR1_SUMMARY_TILES_FOR_API: Readonly<
  Partial<Record<Gstr1DownloadApiName, readonly number[]>>
> = {
  b2b: [0],
  'b2b-einv': [0],
  b2ba: [0],
  b2cl: [1],
  b2cla: [1],
  exp: [2],
  'exp-einv': [2],
  expa: [2],
  b2cs: [3],
  b2csa: [3],
  nil: [4],
  cdnr: [5],
  'cdnr-einv': [5],
  cdnra: [5],
  cdnur: [6],
  'cdnur-einv': [6],
  cdnura: [6],
  at: [7],
  ata: [7],
  txp: [8],
  txpa: [8],
  hsnsum: [9],
  doc_issue: [10],
  ecom: [11],
  ecoma: [11],
  supeco: [12],
  supecoa: [12],
};

/** Prefer this `api_name` when the user picks a dashboard tile index. */
export const GSTR1_SECTION_CARD_PRIMARY_API: ReadonlyArray<Gstr1DownloadApiName> = [
  'b2b',
  'b2cl',
  'exp',
  'b2cs',
  'nil',
  'cdnr',
  'cdnur',
  'at',
  'txp',
  'hsnsum',
  'doc_issue',
  'ecom',
  'supeco',
];

export function portalSectionTitleForApi(api: Gstr1DownloadApiName): string {
  const tiles = GSTR1_SUMMARY_TILES_FOR_API[api];
  const tile0 = tiles?.[0];
  if (tile0 !== undefined) {
    return GSTR1_SUMMARY_SECTION_TITLES[tile0] ?? api;
  }
  const direct = GSTR1_SECTION_CARD_PRIMARY_API.indexOf(api);
  if (direct >= 0) {
    return GSTR1_SUMMARY_SECTION_TITLES[direct] ?? api;
  }
  return api;
}
