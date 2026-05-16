/** Tab mirrors GST portal Section 14 — Supplies through ECO. */
export type Gstr1EcoSupplyTab = 'tcs' | 'ninefive';

export interface Gstr1EcoSupplyRow {
  readonly num: number;
  readonly ecoGstin: string;
  readonly tradeLegalName: string;
  readonly netVal: number;
  readonly igst: number;
  readonly cgst: number;
  readonly sgst: number;
  readonly cess: number;
}

export interface Gstr1EcoSuppliesState {
  readonly tcs: readonly Gstr1EcoSupplyRow[];
  readonly ninefive: readonly Gstr1EcoSupplyRow[];
}

export function emptyEcoSuppliesState(): Gstr1EcoSuppliesState {
  return { tcs: [], ninefive: [] };
}

export function ecoSuppliesStorageKey(gstin: string, retPeriod: string): string {
  return `gstr1-eco-supplies:${gstin.trim().toUpperCase()}:${retPeriod.trim()}`;
}
