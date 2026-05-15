/** GSTN nil-rated row codes (`INTRAB*` = inter-state, `INTRB*` = intra-state — not `INTERB2*`). */
export type Gstr1NilSplyTy =
  | 'INTRB2B'
  | 'INTRB2C'
  | 'INTRAB2B'
  | 'INTRAB2C';

/**
 * NIL-rated / exempt / non-GST grid rows — NIC `nil.inv[].sply_ty`.
 *
 * Inter-state rows use **`INTRAB2B` / `INTRAB2C`** (GSTN / sandbox schema), not `INTERB2B` / `INTERB2C`.
 */
export const GSTR1_NIL_SUPPLY_ROWS: readonly {
  readonly sply_ty: Gstr1NilSplyTy;
  readonly label: string;
}[] = [
  {
    sply_ty: 'INTRB2B',
    label: 'Intra-state supplies to registered person',
  },
  {
    sply_ty: 'INTRB2C',
    label: 'Intra-state supplies to unregistered person',
  },
  {
    sply_ty: 'INTRAB2B',
    label: 'Inter-state supplies to registered person',
  },
  {
    sply_ty: 'INTRAB2C',
    label: 'Inter-state supplies to unregistered person',
  },
];

/**
 * Order of objects inside `nil.inv` when posting retsave — matches GSTN “Get NIL supplies” example
 * (`INTRAB2B`, `INTRAB2C`, `INTRB2B`, `INTRB2C`) while UI rows stay in portal table order.
 */
export const GSTR1_NIL_RESAVE_INV_ORDER: readonly {
  readonly sply_ty: Gstr1NilSplyTy;
  readonly lineIndex: number;
}[] = [
  { sply_ty: GSTR1_NIL_SUPPLY_ROWS[2].sply_ty, lineIndex: 2 },
  { sply_ty: GSTR1_NIL_SUPPLY_ROWS[3].sply_ty, lineIndex: 3 },
  { sply_ty: GSTR1_NIL_SUPPLY_ROWS[0].sply_ty, lineIndex: 0 },
  { sply_ty: GSTR1_NIL_SUPPLY_ROWS[1].sply_ty, lineIndex: 1 },
];
