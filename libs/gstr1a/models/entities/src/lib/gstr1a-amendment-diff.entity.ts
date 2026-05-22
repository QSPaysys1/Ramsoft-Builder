/** Field-level delta between original and amended invoice rows. */
export interface Gstr1aFieldDiff {
  readonly field: string;
  readonly label: string;
  readonly original: string | number | null;
  readonly amended: string | number | null;
  readonly changed: boolean;
}

export interface Gstr1aInvoiceDiffSummary {
  readonly invoiceKey: string;
  readonly ctin: string;
  readonly diffs: readonly Gstr1aFieldDiff[];
  readonly hasChanges: boolean;
}
