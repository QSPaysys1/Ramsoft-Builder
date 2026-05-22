/**
 * Reusable invoice comparison for GSTR-2B vs books / GSTR-2A.
 * Full reconciliation UI lives in feature/reconciliation; this is pure logic.
 */
export interface Gstr2bCompareInvoiceKey {
  readonly supplierGstin: string;
  readonly invoiceNumber: string;
  readonly invoiceDate: string;
}

export type Gstr2bMismatchKind =
  | 'missing_in_books'
  | 'missing_in_2b'
  | 'amount_mismatch'
  | 'itc_mismatch';

export interface Gstr2bMismatchRow {
  readonly key: Gstr2bCompareInvoiceKey;
  readonly kind: Gstr2bMismatchKind;
  readonly message: string;
}

export function gstr2bInvoiceKey(
  supplierGstin: string,
  invoiceNumber: string,
  invoiceDate: string,
): string {
  return `${supplierGstin.trim().toUpperCase()}|${invoiceNumber.trim()}|${invoiceDate.trim()}`;
}

/** Placeholder: extend with tax/ITC field diff when reconciliation store is wired. */
export function gstr2bCompareInvoiceKeys(
  left: readonly Gstr2bCompareInvoiceKey[],
  right: readonly Gstr2bCompareInvoiceKey[],
): readonly Gstr2bMismatchRow[] {
  const rightSet = new Set(right.map((r) => gstr2bInvoiceKey(r.supplierGstin, r.invoiceNumber, r.invoiceDate)));
  const out: Gstr2bMismatchRow[] = [];
  for (const inv of left) {
    const k = gstr2bInvoiceKey(inv.supplierGstin, inv.invoiceNumber, inv.invoiceDate);
    if (!rightSet.has(k)) {
      out.push({
        key: inv,
        kind: 'missing_in_books',
        message: 'Invoice present in GSTR-2B but not in comparison set',
      });
    }
  }
  return out;
}
