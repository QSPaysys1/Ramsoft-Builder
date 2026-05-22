/** Hub tiles: migrated sections use `/gstr2b/*`; others stay on GSTR-1 workspace until ported. */
export const GSTR2B_HUB_NAV = [
  { id: 'summary', label: 'Summary & all tables', route: '/gstr2b/summary' },
  { id: 'b2b', label: 'B2B documents (library)', route: '/gstr2b/b2b' },
  { id: 'recon', label: 'Reconciliation', route: '/gstr2b/reconciliation' },
] as const;
