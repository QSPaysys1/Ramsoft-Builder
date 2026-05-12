/**
 * NIC IRN JSON v1.1-aligned types for GSTZen `einvoice-json` / generate APIs.
 * Optional fields mirror NIC samples; send only populated values in payloads.
 */

export interface TranDtls {
  TaxSch: string;
  SupTyp: string;
  RegRev: string;
  EcmGstin?: string;
  IgstOnIntra: string;
}

export interface DocDtls {
  Typ?: string;
  No?: string;
  Dt?: string;
}

export interface SellerDtls {
  Gstin?: string;
  LglNm?: string;
  TrdNm?: string;
  Pos?: string;
  Addr1?: string;
  Addr2?: string;
  Loc?: string;
  Pin?: number;
  Stcd?: string;
  Ph?: string;
  Em?: string;
}

export interface BuyerDtls {
  Gstin?: string;
  LglNm?: string;
  TrdNm?: string;
  Pos?: string;
  Addr1?: string;
  Addr2?: string;
  Loc?: string;
  Pin?: number;
  Stcd?: string;
  Ph?: string;
  Em?: string;
}

export interface DispDtls {
  Nm?: string;
  Addr1?: string;
  Addr2?: string;
  Loc?: string;
  Pin?: number;
  Stcd?: string;
}

export interface ShipDtls {
  Gstin?: string;
  LglNm?: string;
  TrdNm?: string;
  Pos?: string;
  Addr1?: string;
  Addr2?: string;
  Loc?: string;
  Pin?: number;
  Stcd?: string;
}

export interface BatchDetails {
  Nm?: string;
  ExpDt?: string;
  WrDt?: string;
}

export interface ItemListEntry {
  ItemNo?: number;
  SlNo: string;
  PrdDesc?: string;
  IsServc: string;
  HsnCd?: string;
  Barcde?: string;
  Qty: number;
  FreeQty?: number;
  Unit?: string;
  UnitPrice?: number;
  TotAmt?: number;
  Discount?: number;
  PreTaxVal?: number;
  AssAmt?: number;
  GstRt?: number;
  IgstAmt?: number;
  CgstAmt?: number;
  SgstAmt?: number;
  CesRt?: number;
  CesAmt?: number;
  CesNonAdvlAmt?: number;
  StateCesRt?: number;
  StateCesAmt?: number;
  StateCesNonAdvlAmt?: number;
  OthChrg?: number;
  TotItemVal?: number;
  OrdLineRef?: string;
  OrgCntry?: string;
  PrdSlNo?: string;
  BchDtls?: BatchDetails;
}

export interface ValDtls {
  AssVal?: number;
  CgstVal?: number;
  SgstVal?: number;
  IgstVal?: number;
  CesVal?: number;
  StCesVal?: number;
  Discount?: number;
  OthChrg?: number;
  RndOffAmt?: number;
  TotInvVal?: number;
  OtherChargesDetails?: number;
}

export interface PayDtls {
  Nm?: string;
  Accdet?: string;
  Mode?: string;
  Fininsbr?: string;
  Payterm?: string;
  Payinstr?: string;
  Crtrn?: string;
  Dirdr?: string;
  Crday?: number;
  Paidamt?: number;
  PaymtDue?: number;
}

export interface PrecDocDtls {
  InvNo?: string;
  InvDt?: string;
  OthRefNo?: string;
}

export interface RefDtls {
  DocPerdDtls?: { FrDt?: string; ToDt?: string };
  PrecDocDtls?: PrecDocDtls[];
}

export interface AddlDocDtls {
  Url?: string;
  Docs?: string;
  Info?: string;
}

export interface ExpDtls {
  ForCur?: string;
  CntCode?: string;
  Port?: string;
  RefClm?: string;
  ShipBNo?: string;
  ShipBDt?: string;
  WthPay?: string;
}

export interface EwbDtls {
  TransId?: string | null;
  TransName?: string;
  TransMode?: string;
  Distance?: number;
  VehNo?: string;
  VehType?: string;
  TransDocNo?: string;
  TransDocDt?: string;
}

/** Root body posted to GSTZen e-invoice generation. */
export interface EinvoiceGenerateRequest {
  Version: string;
  TranDtls: TranDtls;
  DocDtls: DocDtls;
  SellerDtls: SellerDtls;
  BuyerDtls: BuyerDtls;
  DispDtls?: DispDtls;
  ShipDtls?: ShipDtls;
  ItemList: ItemListEntry[];
  ValDtls: ValDtls;
  PayDtls?: PayDtls;
  RefDtls?: RefDtls;
  AddlDocDtls?: AddlDocDtls[];
  ExpDtls?: ExpDtls;
  EwbDtls?: EwbDtls;
}

/** Normalized success fields (GSTZen / NIC responses vary slightly). */
export interface EinvoiceGenerateSuccess {
  Irn?: string;
  AckNo?: string;
  AckDt?: string;
  SignedInvoice?: string;
  SignedQRCode?: string;
  Status?: string;
  EwbNo?: string;
  EwbDt?: string;
  EwbValidTill?: string;
}

export interface EinvoiceErrorDetail {
  ErrorCode?: string;
  ErrorMessage?: string;
}

/** Raw API JSON (success or error wrapper). */
export type EinvoiceGenerateResponse = EinvoiceGenerateSuccess & {
  Success?: string | boolean;
  ErrorDetails?: EinvoiceErrorDetail[];
  ErrorMessage?: string;
  message?: string;
};
