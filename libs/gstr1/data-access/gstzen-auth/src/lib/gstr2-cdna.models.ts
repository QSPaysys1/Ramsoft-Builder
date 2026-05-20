/**
 * GSTZen `POST /api/gstr2/cdna/` — GSTR-2A amendments to credit/debit notes (Bearer).
 */
export interface Gstr2CdnaRequestBody {
  readonly gstin: string;
  readonly ret_period: string;
}

/** Supplier row on the CDNA landing table. */
export interface Gstr2aCdnaSupplierSummary {
  readonly supplierGstin: string;
  readonly supplierName: string;
  readonly noteCount: number;
  readonly gstr1FilingStatus: string;
  readonly gstr1FilingDate: string;
  readonly gstr1FilingPeriod: string;
  readonly gstr3bFilingStatus: string;
  readonly cancellationDate: string;
}
