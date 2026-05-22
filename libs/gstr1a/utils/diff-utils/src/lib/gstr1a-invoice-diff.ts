import type {
  Gstr1aFieldDiff,
  Gstr1aInvoiceDiffSummary,
} from '@ramsoft-builder/gstr1a/models/entities';

const COMPARE_FIELDS: readonly { key: string; label: string }[] = [
  { key: 'inum', label: 'Invoice number' },
  { key: 'idt', label: 'Invoice date' },
  { key: 'val', label: 'Invoice value' },
  { key: 'pos', label: 'Place of supply' },
  { key: 'rchrg', label: 'Reverse charge' },
];

function formatVal(v: unknown): string | number | null {
  if (v === undefined || v === null) {
    return null;
  }
  if (typeof v === 'number' || typeof v === 'string') {
    return v;
  }
  return String(v);
}

/** Compares two GSTZen invoice objects field-by-field for amendment UI. */
export function computeInvoiceFieldDiffs(
  original: Record<string, unknown> | null,
  amended: Record<string, unknown> | null,
  invoiceKey: string,
  ctin: string,
): Gstr1aInvoiceDiffSummary {
  const diffs: Gstr1aFieldDiff[] = COMPARE_FIELDS.map(({ key, label }) => {
    const o = formatVal(original?.[key]);
    const a = formatVal(amended?.[key]);
    const changed = o !== a && !(o == null && a == null);
    return { field: key, label, original: o, amended: a, changed };
  });
  return {
    invoiceKey,
    ctin,
    diffs,
    hasChanges: diffs.some((d) => d.changed),
  };
}

/** Sums tax line items from normalized item rows when present on invoice `itms`. */
export function sumItmsTaxable(inv: Record<string, unknown>): number {
  const itms = inv['itms'];
  if (!Array.isArray(itms)) {
    return 0;
  }
  let s = 0;
  for (const it of itms) {
    if (it && typeof it === 'object') {
      const det = (it as Record<string, unknown>)['itm_det'] as Record<string, unknown> | undefined;
      const txval = det?.['txval'];
      if (typeof txval === 'number') {
        s += txval;
      }
    }
  }
  return s;
}
