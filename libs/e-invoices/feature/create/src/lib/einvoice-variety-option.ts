/**
 * Line-item variety row from account master (legacy usaccounting `varieties()` / Firestore shape).
 * Used to fill HSN/SAC and related fields when `PrdDesc` matches `productName`.
 */
export interface EinvoiceVarietyOption {
  productName: string;
  hsnCode?: string | number;
  /** NIC line UOM (`Unit`). */
  units?: string;
  unitType?: number;
  bags?: number;
  itemType?: string;
  IsServc?: string;
  igst?: number;
  cgst?: number;
  sgst?: number;
}
