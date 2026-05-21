/**
 * GSTZen `POST /api/gstr2/2b/` — GSTR-2B auto-drafted ITC statement (Bearer).
 */
export interface Gstr22bRequestBody {
  readonly gstin: string;
  readonly ret_period: string;
}

export type Gstr2bItcTab = 'itcavl' | 'itcunavl' | 'itcrev' | 'itcrej';

export type Gstr2bMainTab = 'summary' | 'allTables';

export interface Gstr2bTaxAmounts {
  readonly igst: string;
  readonly cgst: string;
  readonly sgst: string;
  readonly cess: string;
}

export interface Gstr2bHeaderMeta {
  readonly gstin: string;
  readonly returnPeriod: string;
  readonly generationDate: string;
  readonly version: string;
}

/** Flat summary table row (SUMMARY tab). */
export interface Gstr2bSummaryRow {
  readonly id: string;
  readonly serial: string;
  readonly heading: string;
  readonly gstr3bTable: string;
  readonly depth: number;
  readonly isPartHeader: boolean;
  readonly isExpandable: boolean;
  readonly parentId: string | null;
  readonly igst: string;
  readonly cgst: string;
  readonly sgst: string;
  readonly cess: string;
}

/** Counter-party summary row (ALL TABLES → supplier wise). */
export interface Gstr2bCpSummRow {
  readonly supplierGstin: string;
  readonly tradeName: string;
  readonly supplyPeriod: string;
  readonly filingDate: string;
  readonly totalDocs: string;
  readonly taxableValue: string;
  readonly integratedTax: string;
  readonly centralTax: string;
  readonly stateTax: string;
  readonly cess: string;
  readonly noteType: string;
  readonly documentType: string;
  readonly portCode: string;
}

/** Invoice-level row (ALL TABLES → document details). */
export interface Gstr2bDocRow {
  readonly supplierGstin: string;
  readonly tradeName: string;
  readonly invoiceNumber: string;
  readonly invoiceType: string;
  readonly invoiceTypeCode: string;
  readonly invoiceDate: string;
  readonly invoiceValue: string;
  readonly placeOfSupply: string;
  readonly reverseCharge: string;
  readonly reverseChargeCode: string;
  readonly taxableValue: string;
  readonly integratedTax: string;
  readonly centralTax: string;
  readonly stateTax: string;
  readonly cess: string;
  readonly gstr1FilingPeriod: string;
  readonly gstr1FilingDate: string;
  readonly itcAvailability: string;
  readonly itcAvailabilityCode: string;
  readonly reason: string;
  readonly source: string;
  readonly taxRatePercent: string;
  readonly irn: string;
  readonly irnDate: string;
}

export interface Gstr2bBundle {
  readonly header: Gstr2bHeaderMeta;
  readonly itcSumm: Record<string, unknown>;
  readonly cpSumm: Record<string, unknown>;
  readonly docData: Record<string, unknown>;
}
