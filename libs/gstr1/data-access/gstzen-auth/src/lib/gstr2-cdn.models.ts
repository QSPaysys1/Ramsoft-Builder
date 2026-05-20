/**
 * GSTZen `POST /api/gstr2/cdn/` — GSTR-2A credit/debit notes (Bearer access token).
 */
export interface Gstr2CdnRequestBody {
  readonly gstin: string;
  readonly ret_period: string;
}

/** Supplier row on the CDN landing table (GSTIN links to note-wise list). */
export interface Gstr2aCdnSupplierSummary {
  readonly supplierGstin: string;
  readonly supplierName: string;
  readonly noteCount: number;
  readonly gstr1FilingStatus: string;
  readonly gstr1FilingDate: string;
  readonly gstr1FilingPeriod: string;
  readonly gstr3bFilingStatus: string;
  readonly cancellationDate: string;
}

/** Credit/debit note wise row (portal note list). */
export interface Gstr2aCdnNoteWiseRow {
  readonly supplierGstin: string;
  readonly supplierName: string;
  readonly noteType: string;
  readonly noteNumber: string;
  readonly noteDate: string;
  readonly placeOfSupply: string;
  readonly noteSupplyType: string;
  readonly reverseCharge: string;
  readonly taxableValue: string;
  readonly integratedTax: string;
  readonly centralTax: string;
  readonly stateTax: string;
  readonly cess: string;
  readonly source: string;
  readonly originalInvoiceNo: string;
  readonly gstr1FilingStatus: string;
  readonly gstr1FilingDate: string;
  readonly gstr1FilingPeriod: string;
  readonly gstr3bFilingStatus: string;
  readonly cancellationDate: string;
  readonly items: readonly Gstr2aCdnItemRow[];
}

/** Line item on credit/debit note detail view. */
export interface Gstr2aCdnItemRow {
  readonly ratePercent: string;
  readonly taxableValue: string;
  readonly integratedTax: string;
  readonly centralTax: string;
  readonly stateTax: string;
  readonly cess: string;
}

export interface Gstr2aCdnBundle {
  readonly suppliers: readonly Gstr2aCdnSupplierSummary[];
  readonly notes: readonly Gstr2aCdnNoteWiseRow[];
}

/** @deprecated Use {@link Gstr2aCdnNoteWiseRow} — kept for CSV helpers. */
export interface Gstr2aCdnRow {
  readonly supplierGstin: string;
  readonly supplierName: string;
  readonly noteNumber: string;
  readonly noteDate: string;
  readonly noteType: string;
  readonly originalInvoiceNo: string;
  readonly gstr1FilingStatus: string;
  readonly gstr1FilingDate: string;
  readonly gstr1FilingPeriod: string;
  readonly gstr3bFilingStatus: string;
  readonly cancellationDate: string;
}

export function gstr2aCdnNoteKey(note: Pick<Gstr2aCdnNoteWiseRow, 'supplierGstin' | 'noteNumber' | 'noteDate'>): string {
  return [note.supplierGstin, note.noteNumber, note.noteDate].join('::');
}
