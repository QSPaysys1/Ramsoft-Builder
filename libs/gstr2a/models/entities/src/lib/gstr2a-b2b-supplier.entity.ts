/** One supplier row for the GSTR-2A B2B portal table. */
export interface Gstr2aB2bSupplierRow {
  readonly supplierGstin: string;
  readonly supplierName: string;
  readonly gstr1FilingStatus: string;
  readonly gstr1FilingDate: string;
  readonly gstr1FilingPeriod: string;
  readonly gstr3bFilingStatus: string;
  readonly cancellationDate: string;
}
