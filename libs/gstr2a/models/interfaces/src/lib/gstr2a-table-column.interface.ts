/** Column definition for GSTR-2A invoice/supplier tables. */
export interface Gstr2aTableColumnDef<TRow extends object> {
  readonly id: string;
  readonly label: string;
  readonly field: keyof TRow & string;
  /** Always shown in the grid (cannot be unchecked). */
  readonly locked?: boolean;
}
