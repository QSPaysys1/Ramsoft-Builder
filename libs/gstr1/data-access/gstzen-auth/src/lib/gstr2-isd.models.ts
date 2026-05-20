/**
 * GSTZen `POST /api/gstr2/isd/` — GSTR-2A ISD credits (Bearer access token).
 */
export interface Gstr2IsdRequestBody {
  readonly gstin: string;
  readonly ret_period: string;
}

/** One ISD credit row for the GSTR-2A ISD table. */
export interface Gstr2aIsdCreditRow {
  readonly isdGstin: string;
  readonly isdName: string;
  readonly documentType: string;
  readonly documentNumber: string;
  readonly documentDate: string;
  readonly originalInvoiceNo: string;
  readonly originalInvoiceDate: string;
  readonly placeOfSupply: string;
  readonly integratedTax: string;
  readonly centralTax: string;
  readonly stateTax: string;
  readonly cess: string;
  readonly gstr1FilingStatus: string;
  readonly gstr1FilingDate: string;
  readonly gstr3bFilingStatus: string;
}
