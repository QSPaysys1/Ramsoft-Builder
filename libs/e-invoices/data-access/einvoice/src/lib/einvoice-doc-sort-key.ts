/** Sort key for e-invoice list: newer first. Supports Firestore timestamps and ISO strings. */
export function einvoiceDocSortKey(doc: Record<string, unknown>): number {
  const n = doc['sortDate2'];
  if (typeof n === 'number' && Number.isFinite(n)) {
    return n;
  }
  const ca = doc['createdAt'];
  if (typeof ca === 'string') {
    const t = Date.parse(ca);
    if (Number.isFinite(t)) {
      return t;
    }
  }
  if (ca && typeof ca === 'object' && ca !== null && 'seconds' in ca) {
    const s = (ca as { seconds?: number }).seconds;
    if (typeof s === 'number') {
      return s * 1000;
    }
  }
  return 0;
}
