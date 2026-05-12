import type { ItemForm, ValForm } from '@ramsoft-builder/einvoice/models/nic';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** True when POS / supply state matches intra-state CGST+SGST split. */
export function isIntraStateSupply(sellerStcd: string, buyerPos: string): boolean {
  const a = (sellerStcd ?? '').trim();
  const b = (buyerPos ?? '').trim();
  return Boolean(a && b && a === b);
}

export function lineGstAmounts(params: {
  assAmt: number;
  gstRt: number;
  intraState: boolean;
}): { igstAmt: number; cgstAmt: number; sgstAmt: number } {
  const tax = round2((params.assAmt * params.gstRt) / 100);
  if (params.intraState) {
    const half = round2(tax / 2);
    return { igstAmt: 0, cgstAmt: half, sgstAmt: round2(tax - half) };
  }
  return { igstAmt: tax, cgstAmt: 0, sgstAmt: 0 };
}

export function sumItemsToValDtls(
  items: ItemForm[],
  val: ValForm,
  intraState: boolean,
): ValForm {
  let assVal = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  let ces = 0;
  let stCes = 0;
  for (const row of items) {
    const ass = round2(Number(row.AssAmt) || 0);
    assVal = round2(assVal + ass);
    const rt = Number(row.GstRt) || 0;
    const g = lineGstAmounts({ assAmt: ass, gstRt: rt, intraState });
    cgst = round2(cgst + (Number(row.CgstAmt) || g.cgstAmt));
    sgst = round2(sgst + (Number(row.SgstAmt) || g.sgstAmt));
    igst = round2(igst + (Number(row.IgstAmt) || g.igstAmt));
    ces = round2(ces + (Number(row.CesAmt) || 0) + (Number(row.CesNonAdvlAmt) || 0));
    stCes = round2(
      stCes + (Number(row.StateCesAmt) || 0) + (Number(row.StateCesNonAdvlAmt) || 0),
    );
  }
  const discount = round2(Number(val.Discount) || 0);
  const oth = round2(Number(val.OthChrg) || 0);
  const rnd = round2(Number(val.RndOffAmt) || 0);
  const totInvVal = round2(assVal + cgst + sgst + igst + ces + stCes - discount + oth + rnd);
  return {
    ...val,
    AssVal: assVal,
    CgstVal: cgst,
    SgstVal: sgst,
    IgstVal: igst,
    CesVal: ces,
    StCesVal: stCes,
    TotInvVal: totInvVal,
  };
}
