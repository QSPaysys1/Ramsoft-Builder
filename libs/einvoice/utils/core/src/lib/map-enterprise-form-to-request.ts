import type {
  BuyerDtls,
  BuyerForm,
  DocDtls,
  EinvoiceGenerateRequest,
  EwbDtls,
  EnterpriseEinvoiceFormValue,
  ItemForm,
  ItemListEntry,
  PayDtls,
  PayDtlsForm,
  PartyForm,
  SellerDtls,
  ShipDtls,
  TranDtls,
  ValDtls,
} from '@ramsoft-builder/einvoice/models/nic';

function formatDocDateFromIso(iso: string): string {
  const parts = iso.split('-');
  if (parts.length !== 3) {
    return iso;
  }
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}

function num(v: number | string | null | undefined): number {
  if (v === null || v === undefined || v === '') {
    return 0;
  }
  const n = typeof v === 'number' ? v : Number.parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

function partyCore(p: PartyForm): Omit<BuyerDtls, 'Pos'> {
  return {
    Gstin: p.Gstin?.trim() || undefined,
    LglNm: p.LglNm?.trim() || undefined,
    TrdNm: p.TrdNm?.trim() || undefined,
    Addr1: p.Addr1?.trim() || undefined,
    Addr2: p.Addr2?.trim() || undefined,
    Loc: p.Loc?.trim() || undefined,
    Pin: num(p.Pin) || undefined,
    Stcd: p.Stcd?.trim() || undefined,
    Ph: p.Ph?.trim() || undefined,
    Em: p.Em?.trim() || undefined,
  };
}

function toSeller(p: PartyForm): SellerDtls {
  return partyCore(p);
}

function toBuyer(p: BuyerForm): BuyerDtls {
  return {
    ...partyCore(p),
    Pos: p.Pos?.trim() || undefined,
  };
}

function buildShipDtls(ship: EnterpriseEinvoiceFormValue['ship'], buyer: BuyerForm): ShipDtls {
  if (ship.sameShipping) {
    return toBuyer(buyer);
  }
  const { sameShipping: _s, ...rest } = ship;
  void _s;
  return partyCore(rest as PartyForm) as ShipDtls;
}

function mapItem(row: ItemForm): ItemListEntry {
  const bch =
    row.BchNm?.trim() || row.BchExpDt?.trim() || row.BchWrDt?.trim()
      ? {
          Nm: row.BchNm?.trim() || undefined,
          ExpDt: row.BchExpDt?.trim() || undefined,
          WrDt: row.BchWrDt?.trim() || undefined,
        }
      : undefined;

  return {
    ItemNo: num(row.ItemNo) > 0 ? num(row.ItemNo) : undefined,
    SlNo: row.SlNo?.toString() || '1',
    PrdDesc: row.PrdDesc,
    IsServc: row.IsServc || 'N',
    HsnCd: row.HsnCd,
    Barcde: row.Barcde?.trim() || undefined,
    Qty: num(row.Qty),
    FreeQty: num(row.FreeQty),
    Unit: row.Unit,
    UnitPrice: num(row.UnitPrice),
    TotAmt: num(row.TotAmt),
    Discount: num(row.Discount),
    PreTaxVal: num(row.PreTaxVal),
    AssAmt: num(row.AssAmt),
    GstRt: num(row.GstRt),
    IgstAmt: num(row.IgstAmt),
    CgstAmt: num(row.CgstAmt),
    SgstAmt: num(row.SgstAmt),
    CesRt: num(row.CesRt),
    CesAmt: num(row.CesAmt),
    CesNonAdvlAmt: num(row.CesNonAdvlAmt),
    StateCesRt: num(row.StateCesRt),
    StateCesAmt: num(row.StateCesAmt),
    StateCesNonAdvlAmt: num(row.StateCesNonAdvlAmt),
    OthChrg: num(row.OthChrg),
    TotItemVal: num(row.TotItemVal),
    ...(bch ? { BchDtls: bch } : {}),
  };
}

export function mapEwbFormToEwbDtls(ewb: EnterpriseEinvoiceFormValue['ewb']): EwbDtls {
  const rawDocDt = ewb.TransDocDt?.toString().trim() ?? '';
  const transDocDt = rawDocDt
    ? /^\d{4}-\d{2}-\d{2}$/.test(rawDocDt)
      ? formatDocDateFromIso(rawDocDt)
      : rawDocDt
    : undefined;
  return {
    TransId: ewb.TransId?.trim() || undefined,
    TransName: ewb.TransName?.trim() || undefined,
    TransMode: ewb.TransMode?.trim() || undefined,
    Distance: num(ewb.Distance) || undefined,
    VehNo: ewb.VehNo?.trim() || undefined,
    VehType: ewb.VehType?.trim() || undefined,
    TransDocNo: ewb.TransDocNo?.trim() || undefined,
    TransDocDt: transDocDt,
  };
}

function hasDisp(d: EnterpriseEinvoiceFormValue['disp']): boolean {
  return Boolean(
    d.Nm?.trim() ||
      d.Addr1?.trim() ||
      d.Addr2?.trim() ||
      d.Loc?.trim() ||
      d.Stcd?.trim() ||
      num(d.Pin),
  );
}

function mergeOthChrg(v: EnterpriseEinvoiceFormValue): number {
  let o = num(v.val.OtherChargesDetails);
  for (const p of v.extraParameters) {
    if (p.type === 'Add') {
      o += num(p.value);
    } else {
      o -= num(p.value);
    }
  }
  return Math.round(o * 100) / 100;
}

function mapPayDtls(p: PayDtlsForm): PayDtls | undefined {
  const out: PayDtls = {
    Nm: p.Nm?.trim() || undefined,
    Accdet: p.Accdet?.trim() || undefined,
    Mode: p.Mode?.trim() || undefined,
    Fininsbr: p.Fininsbr?.trim() || undefined,
    Payterm: p.Payterm?.trim() || undefined,
    Payinstr: p.Payinstr?.trim() || undefined,
    Crtrn: p.Crtrn?.trim() || undefined,
    Dirdr: p.Dirdr?.trim() || undefined,
    Crday: num(p.Crday) || undefined,
    Paidamt: num(p.Paidamt) || undefined,
    PaymtDue: num(p.PaymtDue) || undefined,
  };
  return Object.values(out).some((x) => x !== undefined && x !== '' && x !== 0)
    ? out
    : undefined;
}

export function mapEnterpriseFormToRequest(
  v: EnterpriseEinvoiceFormValue,
  options: { includeEwb: boolean },
): EinvoiceGenerateRequest {
  const tran: TranDtls = {
    TaxSch: v.tran.TaxSch,
    SupTyp: v.tran.SupTyp,
    RegRev: v.tran.RegRev,
    IgstOnIntra: v.tran.IgstOnIntra,
    ...(v.tran.EcmGstin?.trim() ? { EcmGstin: v.tran.EcmGstin.trim() } : {}),
  };

  const doc: DocDtls = {
    Typ: v.doc.Typ,
    No: v.doc.No?.trim(),
    Dt: formatDocDateFromIso(v.doc.Dt),
  };

  const seller = toSeller(v.seller);
  const buyer = toBuyer(v.buyer);
  const ship = buildShipDtls(v.ship, v.buyer);

  const mergedOth = mergeOthChrg(v);

  const val: ValDtls = {
    AssVal: num(v.val.AssVal),
    CgstVal: num(v.val.CgstVal),
    SgstVal: num(v.val.SgstVal),
    IgstVal: num(v.val.IgstVal),
    CesVal: num(v.val.CesVal),
    StCesVal: num(v.val.StCesVal),
    Discount: num(v.val.Discount),
    OthChrg: mergedOth,
    RndOffAmt: num(v.val.RndOffAmt),
    TotInvVal: num(v.val.TotInvVal),
    OtherChargesDetails: num(v.val.OtherChargesDetails),
  };

  const itemList = v.items.map(mapItem);

  const base: EinvoiceGenerateRequest = {
    Version: '1.1',
    TranDtls: tran,
    DocDtls: doc,
    SellerDtls: seller,
    BuyerDtls: buyer,
    ShipDtls: ship,
    ItemList: itemList,
    ValDtls: val,
  };

  if (hasDisp(v.disp)) {
    base.DispDtls = {
      Nm: v.disp.Nm?.trim() || undefined,
      Addr1: v.disp.Addr1?.trim() || undefined,
      Addr2: v.disp.Addr2?.trim() || undefined,
      Loc: v.disp.Loc?.trim() || undefined,
      Pin: num(v.disp.Pin) || undefined,
      Stcd: v.disp.Stcd?.trim() || undefined,
    };
  }

  if (options.includeEwb) {
    base.EwbDtls = mapEwbFormToEwbDtls(v.ewb);
  }

  const pay = mapPayDtls(v.pay);
  if (pay) {
    base.PayDtls = pay;
  }

  return base;
}
