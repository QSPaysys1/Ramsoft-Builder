/** Legacy `/gstr1/workspace/gstr1a-*` → `/gstr1a/*` (query params preserved). */
export const GSTR1A_LEGACY_ROUTE_MAP: Record<string, string> = {
  'gstr1a-view': '/gstr1a/hub',
  'gstr1a-b2b': '/gstr1a/b2b',
  'gstr1a-b2cl': '/gstr1a/b2cl',
  'gstr1a-exp': '/gstr1a/exp',
  'gstr1a-b2cs': '/gstr1a/b2cs',
  'gstr1a-nil': '/gstr1a/nil',
  'gstr1a-cdnr': '/gstr1a/cdnr',
  'gstr1a-cdnur': '/gstr1a/cdnur',
  'gstr1a-at': '/gstr1a/at',
  'gstr1a-hsn': '/gstr1a/hsn',
};

/** GSTR-1 download workspace amend routes → GSTR-1A amendment sections. */
export const GSTR1A_AMEND_LEGACY_ROUTE_MAP: Record<string, string> = {
  'amend-b2b': '/gstr1a/b2ba',
  'amend-b2cla': '/gstr1a/b2cla',
  'amend-exp': '/gstr1a/expa',
  'amend-cdnra': '/gstr1a/cdnra',
  'amend-cdnura': '/gstr1a/cdnura',
  'amend-b2csa': '/gstr1a/b2csa',
  'amend-ata': '/gstr1a/ata',
  'amend-txpa': '/gstr1a/txpa',
  'amend-ecoma': '/gstr1a/ecoma',
  'amend-supecoa': '/gstr1a/supecoa',
};
