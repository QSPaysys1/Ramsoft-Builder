import type { Gstr2bSectionDocKey } from '@ramsoft-builder/gstr2b/models/enums';

export interface Gstr2bSectionRouteDef {
  readonly path: string;
  readonly label: string;
  readonly docDataKey: Gstr2bSectionDocKey;
  readonly cpSummKey: Gstr2bSectionDocKey;
}

/** Document slice keys match `Gstr2bBundle.docData` / `cpSumm` keys from GSTZen. */
export const GSTR2B_SECTION_ROUTES: readonly Gstr2bSectionRouteDef[] = [
  { path: 'b2b', label: 'B2B', docDataKey: 'b2b', cpSummKey: 'b2b' },
  { path: 'b2ba', label: 'B2B (Amendment)', docDataKey: 'b2ba', cpSummKey: 'b2ba' },
  { path: 'cdn', label: 'CDN', docDataKey: 'cdnr', cpSummKey: 'cdnr' },
  { path: 'cdna', label: 'CDN (Amendment)', docDataKey: 'cdnra', cpSummKey: 'cdnra' },
  { path: 'isd', label: 'ISD', docDataKey: 'isd', cpSummKey: 'isd' },
  { path: 'isda', label: 'ISD (Amendment)', docDataKey: 'isda', cpSummKey: 'isda' },
  { path: 'impg', label: 'Import', docDataKey: 'impg', cpSummKey: 'impg' },
  { path: 'impgsez', label: 'Import SEZ', docDataKey: 'impgsez', cpSummKey: 'impgsez' },
  { path: 'ecom', label: 'ECO', docDataKey: 'ecom', cpSummKey: 'ecom' },
  { path: 'ecoma', label: 'ECO (Amendment)', docDataKey: 'ecoma', cpSummKey: 'ecoma' },
];

export const GSTR2B_B2B_DOC_KEY = 'b2b' as const;
