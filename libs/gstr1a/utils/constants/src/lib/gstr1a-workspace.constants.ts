import type { Gstr1aDownloadApiName } from '@ramsoft-builder/gstr1a/models/entities';

export const GSTR1A_SECTION_CARD_PRIMARY_API: readonly Gstr1aDownloadApiName[] = [
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
  'ecom',
  'supeco',
];

export const GSTR1A_SUMMARY_SECTION_TITLES: readonly string[] = [
  '4A, 4B, 6B, 6C - B2B, SEZ, DE Invoices',
  '5 - B2C (Large) Invoices',
  '6A - Exports Invoices',
  '7 - B2C (Others)',
  '8A, 8B, 8C, 8D - Nil Rated Supplies',
  '9B - Credit / Debit Notes (Registered)',
  '9B - Credit / Debit Notes (Unregistered)',
  '11A(1), 11A(2) - Tax Liability (Advance Received)',
  '11B(1), 11B(2) - Adjustment of Advances',
  '12 - HSN-wise summary of outward supplies',
  '13 - Documents Issued',
  '14 - Supplies made through ECO',
  '15 - Supplies U/s 9(5)',
];
