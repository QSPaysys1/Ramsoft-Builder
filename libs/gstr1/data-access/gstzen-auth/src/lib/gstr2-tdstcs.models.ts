/**
 * GSTZen `POST /api/gstr2/tdstcs/` — GSTR-2A TDS / TDS amendments / TCS (Bearer).
 *
 * Response: `{ status: 1, message: { tds[], tdsa[], tcs[], tcsa[], summary } }`.
 */
export interface Gstr2TdstcsRequestBody {
  readonly gstin: string;
  readonly ret_period: string;
}

export type Gstr2aTdsTcsSection = 'tds' | 'tdsa' | 'tcs';

/** One flat credit row from `message.tds` / `tdsa` / `tcs`. */
export interface Gstr2aTdsTcsCreditRow {
  readonly partyGstin: string;
  readonly partyName: string;
  readonly creditSection: string;
  /** `month` (MMYYYY) — return period of the credit line. */
  readonly creditMonth: string;
  /** `omonth` — original period for amendment rows (`tdsa` / `tcsa`). */
  readonly originalPeriod: string;
  readonly amount: string;
  readonly integratedTax: string;
  readonly centralTax: string;
  readonly stateTax: string;
  readonly cess: string;
  /** Portal action flag (`flag`, typically `N` / `Y`). */
  readonly flag: string;
  readonly placeOfSupply: string;
  readonly gstr1FilingStatus: string;
  readonly gstr1FilingDate: string;
  readonly gstr3bFilingStatus: string;
}

export interface Gstr2aTdsTcsBundle {
  readonly tds: readonly Gstr2aTdsTcsCreditRow[];
  readonly tdsa: readonly Gstr2aTdsTcsCreditRow[];
  readonly tcs: readonly Gstr2aTdsTcsCreditRow[];
}
