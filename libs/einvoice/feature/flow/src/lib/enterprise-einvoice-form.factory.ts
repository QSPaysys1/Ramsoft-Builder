import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import type { EnterpriseEinvoiceFormValue, ItemForm } from '@ramsoft-builder/einvoice/models/nic';
import { createEmptyEnterpriseEinvoiceForm } from '@ramsoft-builder/einvoice/utils/core';

function partyGroup(fb: FormBuilder, p: EnterpriseEinvoiceFormValue['seller']): FormGroup {
  return fb.group({
    Gstin: [p.Gstin, Validators.required],
    LglNm: [p.LglNm, Validators.required],
    TrdNm: [p.TrdNm],
    Addr1: [p.Addr1, Validators.required],
    Addr2: [p.Addr2],
    Loc: [p.Loc, Validators.required],
    Pin: [p.Pin, [Validators.required, Validators.pattern(/^[0-9]{6}$/)]],
    Stcd: [p.Stcd, Validators.required],
    Ph: [p.Ph],
    Em: [p.Em],
  });
}

function itemRow(fb: FormBuilder, row: ItemForm): FormGroup {
  return fb.group({
    ItemNo: [row.ItemNo],
    SlNo: [row.SlNo, Validators.required],
    IsServc: [row.IsServc],
    PrdDesc: [row.PrdDesc, Validators.required],
    HsnCd: [row.HsnCd, [Validators.required, Validators.pattern(/^[0-9]{2,8}$/)]],
    Barcde: [row.Barcde],
    Qty: [row.Qty, [Validators.required, Validators.min(0.001)]],
    FreeQty: [row.FreeQty],
    Unit: [row.Unit, Validators.required],
    UnitPrice: [row.UnitPrice],
    TotAmt: [row.TotAmt],
    Discount: [row.Discount],
    PreTaxVal: [row.PreTaxVal],
    AssAmt: [row.AssAmt, Validators.required],
    GstRt: [row.GstRt, Validators.required],
    IgstAmt: [row.IgstAmt],
    CgstAmt: [row.CgstAmt],
    SgstAmt: [row.SgstAmt],
    CesRt: [row.CesRt],
    CesAmt: [row.CesAmt],
    CesNonAdvlAmt: [row.CesNonAdvlAmt],
    StateCesRt: [row.StateCesRt],
    StateCesAmt: [row.StateCesAmt],
    StateCesNonAdvlAmt: [row.StateCesNonAdvlAmt],
    OthChrg: [row.OthChrg],
    TotItemVal: [row.TotItemVal, Validators.required],
    BchNm: [row.BchNm],
    BchExpDt: [row.BchExpDt],
    BchWrDt: [row.BchWrDt],
  });
}

export function buildEnterpriseEinvoiceFormGroup(
  fb: FormBuilder,
  initial: EnterpriseEinvoiceFormValue | null,
): FormGroup {
  const d = initial ?? createEmptyEnterpriseEinvoiceForm();
  return fb.group({
    tran: fb.group({
      TaxSch: [d.tran.TaxSch, Validators.required],
      SupTyp: [d.tran.SupTyp, Validators.required],
      RegRev: [d.tran.RegRev, Validators.required],
      IgstOnIntra: [d.tran.IgstOnIntra, Validators.required],
      EcmGstin: [d.tran.EcmGstin],
    }),
    doc: fb.group({
      Typ: [d.doc.Typ, Validators.required],
      No: [d.doc.No, Validators.required],
      Dt: [d.doc.Dt, Validators.required],
    }),
    seller: partyGroup(fb, d.seller),
    buyer: fb.group({
      Gstin: [d.buyer.Gstin, Validators.required],
      LglNm: [d.buyer.LglNm, Validators.required],
      TrdNm: [d.buyer.TrdNm],
      Addr1: [d.buyer.Addr1, Validators.required],
      Addr2: [d.buyer.Addr2],
      Loc: [d.buyer.Loc, Validators.required],
      Pin: [d.buyer.Pin, [Validators.required, Validators.pattern(/^[0-9]{6}$/)]],
      Stcd: [d.buyer.Stcd, Validators.required],
      Ph: [d.buyer.Ph],
      Em: [d.buyer.Em],
      Pos: [d.buyer.Pos, Validators.required],
    }),
    ship: fb.group({
      Gstin: [d.ship.Gstin],
      LglNm: [d.ship.LglNm],
      TrdNm: [d.ship.TrdNm],
      Addr1: [d.ship.Addr1],
      Addr2: [d.ship.Addr2],
      Loc: [d.ship.Loc],
      Pin: [d.ship.Pin],
      Stcd: [d.ship.Stcd],
      Ph: [d.ship.Ph],
      Em: [d.ship.Em],
      sameShipping: [d.ship.sameShipping],
    }),
    disp: fb.group({
      Nm: [d.disp.Nm],
      Addr1: [d.disp.Addr1],
      Addr2: [d.disp.Addr2],
      Loc: [d.disp.Loc],
      Pin: [d.disp.Pin],
      Stcd: [d.disp.Stcd],
    }),
    val: fb.group({
      AssVal: [d.val.AssVal],
      CgstVal: [d.val.CgstVal],
      SgstVal: [d.val.SgstVal],
      IgstVal: [d.val.IgstVal],
      CesVal: [d.val.CesVal],
      StCesVal: [d.val.StCesVal],
      Discount: [d.val.Discount],
      OthChrg: [d.val.OthChrg],
      RndOffAmt: [d.val.RndOffAmt],
      TotInvVal: [d.val.TotInvVal, Validators.required],
      OtherChargesDetails: [d.val.OtherChargesDetails],
    }),
    items: fb.array(d.items.map((row) => itemRow(fb, row))),
    ewb: fb.group({
      TransId: [d.ewb.TransId],
      TransName: [d.ewb.TransName],
      TransMode: [d.ewb.TransMode, Validators.required],
      Distance: [d.ewb.Distance, [Validators.required, Validators.min(0), Validators.max(4000)]],
      VehNo: [d.ewb.VehNo],
      VehType: [d.ewb.VehType, Validators.required],
      TransDocNo: [d.ewb.TransDocNo],
      TransDocDt: [d.ewb.TransDocDt],
    }),
    extraParameters: fb.array(
      d.extraParameters.map((p) =>
        fb.group({
          type: [p.type, Validators.required],
          parameter: [p.parameter],
          value: [p.value],
        }),
      ),
    ),
    pay: fb.group({
      Nm: [d.pay.Nm],
      Accdet: [d.pay.Accdet],
      Mode: [d.pay.Mode],
      Fininsbr: [d.pay.Fininsbr],
      Payterm: [d.pay.Payterm],
      Payinstr: [d.pay.Payinstr],
      Crtrn: [d.pay.Crtrn],
      Dirdr: [d.pay.Dirdr],
      Crday: [d.pay.Crday],
      Paidamt: [d.pay.Paidamt],
      PaymtDue: [d.pay.PaymtDue],
    }),
  });
}

export function formValueToEnterprise(
  raw: Record<string, unknown>,
): EnterpriseEinvoiceFormValue {
  return raw as unknown as EnterpriseEinvoiceFormValue;
}

export function appendItemRow(fb: FormBuilder, items: FormArray<FormGroup>): void {
  const idx = items.length + 1;
  const row = createEmptyEnterpriseEinvoiceForm().items[0];
  row.ItemNo = idx;
  row.SlNo = String(idx);
  items.push(itemRow(fb, row));
}
