/**
 * GSTZen `POST /api/gstr2/b2ba/` — GSTR-2A amendments to B2B (Bearer access token).
 */
export interface Gstr2B2baRequestBody {
  readonly gstin: string;
  readonly ret_period: string;
}

/** One supplier row for the GSTR-2A B2BA portal table. */
export interface Gstr2aB2baSupplierRow {
  readonly supplierGstin: string;
  readonly supplierName: string;
  readonly gstr1FilingStatus: string;
  readonly gstr1FilingDate: string;
  readonly gstr1FilingPeriod: string;
  readonly gstr3bFilingStatus: string;
  readonly cancellationDate: string;
}
