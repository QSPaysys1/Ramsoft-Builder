/**
 * GSTZen `POST /api/gstr2/impg/` — GSTR-2A imports on bill of entry (Bearer).
 *
 * Response: `{ status: 1, message: { impg: [...] } }`.
 */
export interface Gstr2ImpgRequestBody {
  readonly gstin: string;
  readonly ret_period: string;
}

/** One row from `message.impg`. */
export interface Gstr2aImpgRow {
  readonly referenceDate: string;
  readonly portCode: string;
  readonly billOfEntryNumber: string;
  readonly billOfEntryDate: string;
  readonly taxableValue: string;
  readonly integratedTax: string;
  readonly cess: string;
  readonly amended: string;
}
