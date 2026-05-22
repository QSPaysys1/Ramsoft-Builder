export function gstr3bWorkspaceCacheKey(gstin: string, retPeriod: string): string {
  return `gstr3b:${gstin.trim().toUpperCase()}:${retPeriod.trim()}`;
}
