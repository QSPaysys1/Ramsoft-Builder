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

/** Names accepted by GSTZen `POST /api/gstr1/download/` only. */
export type Gstr1GstzenDownloadApiName = (typeof GSTR1_DOWNLOAD_API_NAMES)[number];

/**
 * Workspace / route `api_name` values, including tiles that are retsave-only (no download bucket on GSTZen).
 * Example: `doc_issue` — Table 13 documents issued.
 */
export const GSTR1_DOWNLOAD_ROUTE_ONLY_API_NAMES = ['doc_issue'] as const;

export type Gstr1DownloadApiName =
  | Gstr1GstzenDownloadApiName
  | (typeof GSTR1_DOWNLOAD_ROUTE_ONLY_API_NAMES)[number];

/** GSTR-1A `POST /api/gstr1a/download/` sections (GSTZen portal). */
export const GSTR1A_DOWNLOAD_API_NAMES = [
  'retsum',
  'at',
  'ata',
  'b2b',
  'b2ba',
  'b2cl',
  'b2cla',
  'b2cs',
  'b2csa',
  'cdnr',
  'cdnra',
  'cdnur',
  'cdnura',
  'exp',
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

export type Gstr1aDownloadApiName = (typeof GSTR1A_DOWNLOAD_API_NAMES)[number];

/** UI labels aligned with GST portal / GSTZen log references for GSTR-1A downloads. */
export const GSTR1A_DOWNLOAD_API_OPTIONS: readonly {
  readonly value: Gstr1aDownloadApiName;
  readonly label: string;
  readonly description: string;
}[] = [
  {
    value: 'retsum',
    label: 'retsum — Return Summary',
    description: 'Return summary',
  },
  {
    value: 'at',
    label: 'at — Advances (Tax liability)',
    description: 'Tax liability (advances received)',
  },
  {
    value: 'ata',
    label: 'ata — Advances amendments',
    description: 'Advances amendments',
  },
  { value: 'b2b', label: 'b2b — B2B invoices', description: 'B2B invoices' },
  { value: 'b2ba', label: 'b2ba — B2B amendments', description: 'B2B invoice amendments' },
  { value: 'b2cl', label: 'b2cl — B2C (large)', description: 'B2C (large) invoices' },
  { value: 'b2cla', label: 'b2cla — B2C (large) amendments', description: 'B2C (large) amendments' },
  { value: 'b2cs', label: 'b2cs — B2C (small)', description: 'B2C (small) invoices' },
  { value: 'b2csa', label: 'b2csa — B2C (small) amendments', description: 'B2C (small) amendments' },
  { value: 'cdnr', label: 'cdnr — CDN (registered)', description: 'Credit/debit notes (registered)' },
  {
    value: 'cdnra',
    label: 'cdnra — CDN (registered) amendments',
    description: 'CDN amendments (registered)',
  },
  {
    value: 'cdnur',
    label: 'cdnur — CDN (UR / exports)',
    description: 'CDN (against B2CL and exports)',
  },
  {
    value: 'cdnura',
    label: 'cdnura — CDN (UR / exports) amendments',
    description: 'CDN amendments (B2CL & exports)',
  },
  { value: 'exp', label: 'exp — Export invoices', description: 'Export invoices' },
  { value: 'expa', label: 'expa — Export amendments', description: 'Export invoice amendments' },
  {
    value: 'hsnsum',
    label: 'hsnsum — HSN/SAC summary',
    description: 'HSN/SAC outward summary',
  },
  {
    value: 'nil',
    label: 'nil — Nil / exempt / non-GST',
    description: 'Nil, exempt, and non-GST supplies',
  },
  { value: 'txp', label: 'txp — Adjustment of advances', description: 'Adjustment of advances' },
  { value: 'txpa', label: 'txpa — Advance adjustments (amend)', description: 'Advance adjustment amendments' },
  { value: 'ecom', label: 'ecom — E-commerce invoices', description: 'E-commerce invoices' },
  { value: 'ecoma', label: 'ecoma — E-commerce amendments', description: 'E-commerce amendments' },
  { value: 'supeco', label: 'supeco — Supeco invoices', description: 'Supeco invoices' },
  { value: 'supecoa', label: 'supecoa — Supeco amendments', description: 'Supeco amendments' },
];

export interface Gstr1DownloadRequestBody {
  readonly gstin: string;
  readonly ret_period: string;
  readonly api_name: Gstr1GstzenDownloadApiName;
}

/** Request body for GSTR-1A section downloads only. */
export interface Gstr1aDownloadRequestBody {
  readonly gstin: string;
  readonly ret_period: string;
  readonly api_name: Gstr1aDownloadApiName;
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

/** `POST /api/gstr1/reset/` — “Proceed to file / Summary” (GSTZen Bearer). */
export interface Gstr1ResetRequestBody {
  readonly gstin: string;
  readonly ret_period: string;
}

/** Success envelope for GSTR‑1 proceed (example `api_call`: `GSTR1 PROCEED TO FILE`). */
export interface Gstr1ProceedToFileResetSuccess {
  readonly status: number | string;
  readonly api_call?: string;
  readonly message: {
    readonly reference_id: string;
    readonly isSync?: string;
  };
}

export function isGstr1ProceedToFileResetSuccess(
  raw: unknown,
): raw is Gstr1ProceedToFileResetSuccess {
  if (!raw || typeof raw !== 'object') {
    return false;
  }
  const o = raw as Record<string, unknown>;
  if (Number(o['status']) !== 1) {
    return false;
  }

  const apiCall = o['api_call'];
  if (typeof apiCall === 'string' && apiCall.trim().length > 0) {
    const u = apiCall.toUpperCase();
    // GSTZen wording includes `GSTR1`/`GSTR1A` variants.
    if (!u.includes('GSTR1') || !u.includes('PROCEED')) {
      return false;
    }
  }

  const msg = o['message'];
  if (!msg || typeof msg !== 'object' || Array.isArray(msg)) {
    return false;
  }
  const ref = (msg as Record<string, unknown>)['reference_id'];
  return typeof ref === 'string' && ref.trim().length > 0;
}
