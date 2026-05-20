/**
 * GSTZen `POST /api/gstr2/ecom/` — GSTR-2A ECO documents (Bearer access token).
 */
export interface Gstr2EcomRequestBody {
  readonly gstin: string;
  readonly ret_period: string;
}

/** One ECO operator row for the GSTR-2A ECO documents table. */
export interface Gstr2aEcoOperatorRow {
  readonly ecoGstin: string;
  readonly ecoName: string;
  readonly documentCount: number;
  readonly documentSection: string;
  readonly gstr1FilingStatus: string;
  readonly gstr1FilingDate: string;
  readonly gstr1FilingPeriod: string;
  readonly gstr3bFilingStatus: string;
  readonly cancellationDate: string;
}
