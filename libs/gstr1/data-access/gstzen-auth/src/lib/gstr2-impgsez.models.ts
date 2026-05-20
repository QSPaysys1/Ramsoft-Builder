/**
 * GSTZen `POST /api/gstr2/impgsez/` — GSTR-2A SEZ imports on bill of entry (Bearer).
 *
 * Response: `{ status: 1, message: { impgsez: [...] } }`.
 */
export interface Gstr2ImpgsezRequestBody {
  readonly gstin: string;
  readonly ret_period: string;
}

/** One row from `message.impgsez`. */
export interface Gstr2aImpgsezRow {
  readonly referenceDate: string;
  readonly portCode: string;
  readonly billOfEntryNumber: string;
  readonly billOfEntryDate: string;
  readonly sezGstin: string;
  readonly tradeName: string;
  readonly taxableValue: string;
  readonly integratedTax: string;
  readonly cess: string;
  readonly amended: string;
}
