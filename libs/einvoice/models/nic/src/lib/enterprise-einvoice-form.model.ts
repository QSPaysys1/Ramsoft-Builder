/**
 * Enterprise create form — mirrors NIC sections; mapped to {@link EinvoiceGenerateRequest}.
 */

export interface PartyForm {
  Gstin: string;
  LglNm: string;
  TrdNm: string;
  Addr1: string;
  Addr2: string;
  Loc: string;
  Pin: number | string;
  Stcd: string;
  Ph: string;
  Em: string;
}

export interface BuyerForm extends PartyForm {
  Pos: string;
}

export interface ShipForm extends PartyForm {
  sameShipping: boolean;
}

export interface TranForm {
  TaxSch: string;
  SupTyp: string;
  RegRev: string;
  IgstOnIntra: string;
  EcmGstin: string;
}

export interface DocForm {
  Typ: string;
  No: string;
  Dt: string;
}

export interface ValForm {
  AssVal: number;
  CgstVal: number;
  SgstVal: number;
  IgstVal: number;
  CesVal: number;
  StCesVal: number;
  Discount: number;
  OthChrg: number;
  RndOffAmt: number;
  TotInvVal: number;
  OtherChargesDetails: number;
}

export interface EwbForm {
  TransId: string;
  TransName: string;
  TransMode: string;
  Distance: number | string;
  VehNo: string;
  VehType: string;
  TransDocNo: string;
  TransDocDt: string;
}

export interface ItemForm {
  ItemNo: number;
  SlNo: string;
  IsServc: string;
  PrdDesc: string;
  HsnCd: string;
  Barcde: string;
  Qty: number;
  FreeQty: number;
  Unit: string;
  UnitPrice: number;
  TotAmt: number;
  Discount: number;
  PreTaxVal: number;
  AssAmt: number;
  GstRt: number;
  IgstAmt: number;
  CgstAmt: number;
  SgstAmt: number;
  CesRt: number;
  CesAmt: number;
  CesNonAdvlAmt: number;
  StateCesRt: number;
  StateCesAmt: number;
  StateCesNonAdvlAmt: number;
  OthChrg: number;
  TotItemVal: number;
  BchNm: string;
  BchExpDt: string;
  BchWrDt: string;
}

export interface ExtraParameterRow {
  type: 'Add' | 'Less';
  parameter: string;
  value: number;
}

export interface PayDtlsForm {
  Nm: string;
  Accdet: string;
  Mode: string;
  Fininsbr: string;
  Payterm: string;
  Payinstr: string;
  Crtrn: string;
  Dirdr: string;
  Crday: number | string;
  Paidamt: number | string;
  PaymtDue: number | string;
}

export interface EnterpriseEinvoiceFormValue {
  tran: TranForm;
  doc: DocForm;
  seller: PartyForm;
  buyer: BuyerForm;
  ship: ShipForm;
  disp: {
    Nm: string;
    Addr1: string;
    Addr2: string;
    Loc: string;
    Pin: string;
    Stcd: string;
  };
  val: ValForm;
  items: ItemForm[];
  ewb: EwbForm;
  extraParameters: ExtraParameterRow[];
  pay: PayDtlsForm;
}
