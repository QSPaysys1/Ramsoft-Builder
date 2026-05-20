/**
 * GSTZen `POST /api/gstr2/ecoma/` — GSTR-2A amendments to ECO documents (Bearer).
 */
export interface Gstr2EcomaRequestBody {
  readonly gstin: string;
  readonly ret_period: string;
}

/** One ECO operator row for the GSTR-2A ECOA documents table. */
export interface Gstr2aEcomaOperatorRow {
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
