/**
 * GSTZen `POST /api/gstr1/download/` — request/response typing.
 * `message` keys follow the selected `api_name` (for example `message.b2b`).
 */

export const GSTR1_DOWNLOAD_API_NAMES = [
  'retsum',
  'at',
  'ata',
  'b2b',
  'b2b-einv',
  'b2ba',
  'b2cl',
  'b2cla',
  'b2cs',
  'b2csa',
  'cdnr',
  'cdnr-einv',
  'cdnra',
  'cdnur',
  'cdnur-einv',
  'cdnura',
  'exp',
  'exp-einv',
  'expa',
  'hsnsum',
  'nil',
  'txp',
  'txpa',
  'ecom',
  'ecoma',
  'supeco',
  'supecoa',
] as const;

export type Gstr1DownloadApiName = (typeof GSTR1_DOWNLOAD_API_NAMES)[number];

export interface Gstr1DownloadRequestBody {
  readonly gstin: string;
  readonly ret_period: string;
  readonly api_name: Gstr1DownloadApiName;
}

/** Normalized invoice line used for totals, filtering, and flat export views. */
export interface Gstr1DownloadFlatRow {
  readonly ctin: string;
  readonly invoiceNo: string;
  readonly invoiceDate: string;
  readonly invoiceValue: number | null;
  readonly pos: string;
  readonly reverseCharge: string;
  readonly irn: string;
  readonly taxableValue: number;
  readonly igst: number;
  readonly cgst: number;
  readonly sgst: number;
  readonly cess: number;
  readonly lineLabel: string;
}

export interface Gstr1DownloadItemRow {
  readonly lineLabel: string;
  readonly taxableValue: number;
  readonly igst: number;
  readonly cgst: number;
  readonly sgst: number;
  readonly cess: number;
}

export interface Gstr1DownloadInvoiceGroup {
  readonly invoiceKey: string;
  readonly invoiceNo: string;
  readonly invoiceDate: string;
  readonly invoiceValue: number | null;
  readonly pos: string;
  readonly reverseCharge: string;
  readonly irn: string;
  readonly items: readonly Gstr1DownloadItemRow[];
}

export interface Gstr1DownloadCtinGroup {
  readonly ctin: string;
  readonly invoices: readonly Gstr1DownloadInvoiceGroup[];
}

export interface Gstr1DownloadAggregateStats {
  /** `message[api_name].length` from the raw API payload (top-level rows). */
  readonly sourceBucketLength: number;
  readonly totalLineItems: number;
  readonly invoiceCount: number;
  readonly ctinCount: number;
  readonly taxableTotal: number;
  readonly igstTotal: number;
  readonly cgstTotal: number;
  readonly sgstTotal: number;
  readonly cessTotal: number;
  readonly taxGrandTotal: number;
}
