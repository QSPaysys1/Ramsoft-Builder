/** Session-scoped cache key for the single GSTR-2B statement POST. */
export function gstr2bStatementCacheKey(gstin: string, retPeriod: string): string {
  return `gstr2b:${gstin.trim().toUpperCase()}:${retPeriod.trim()}`;
}
