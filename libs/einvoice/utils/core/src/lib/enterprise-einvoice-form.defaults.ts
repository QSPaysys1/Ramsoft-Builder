import type { EnterpriseEinvoiceFormValue, ItemForm } from '@ramsoft-builder/einvoice/models/nic';

function emptyParty(): EnterpriseEinvoiceFormValue['seller'] {
  return {
    Gstin: '',
    LglNm: '',
    TrdNm: '',
    Addr1: '',
    Addr2: '',
    Loc: '',
    Pin: '',
    Stcd: '',
    Ph: '',
    Em: '',
  };
}

function emptyItem(idx: number): ItemForm {
  return {
    ItemNo: idx,
    SlNo: String(idx),
    IsServc: 'N',
    PrdDesc: '',
    HsnCd: '',
    Barcde: '',
    Qty: 1,
    FreeQty: 0,
    Unit: 'BAG',
    UnitPrice: 0,
    TotAmt: 0,
    Discount: 0,
    PreTaxVal: 0,
    AssAmt: 0,
    GstRt: 5,
    IgstAmt: 0,
    CgstAmt: 0,
    SgstAmt: 0,
    CesRt: 0,
    CesAmt: 0,
    CesNonAdvlAmt: 0,
    StateCesRt: 0,
    StateCesAmt: 0,
    StateCesNonAdvlAmt: 0,
    OthChrg: 0,
    TotItemVal: 0,
    BchNm: '',
    BchExpDt: '',
    BchWrDt: '',
  };
}

export function createEmptyEnterpriseEinvoiceForm(): EnterpriseEinvoiceFormValue {
  const today = new Date().toISOString().slice(0, 10);
  return {
    tran: {
      TaxSch: 'GST',
      SupTyp: 'B2B',
      RegRev: 'N',
      IgstOnIntra: 'N',
      EcmGstin: '',
    },
    doc: { Typ: 'INV', No: '', Dt: today },
    seller: emptyParty(),
    buyer: { ...emptyParty(), Pos: '' },
    ship: { ...emptyParty(), sameShipping: true },
    disp: { Nm: '', Addr1: '', Addr2: '', Loc: '', Pin: '', Stcd: '' },
    val: {
      AssVal: 0,
      CgstVal: 0,
      SgstVal: 0,
      IgstVal: 0,
      CesVal: 0,
      StCesVal: 0,
      Discount: 0,
      OthChrg: 0,
      RndOffAmt: 0,
      TotInvVal: 0,
      OtherChargesDetails: 0,
    },
    items: [emptyItem(1)],
    ewb: {
      TransId: '',
      TransName: '',
      TransMode: '1',
      Distance: 0,
      VehNo: '',
      VehType: 'R',
      TransDocNo: '',
      TransDocDt: '',
    },
    extraParameters: [],
    pay: {
      Nm: '',
      Accdet: '',
      Mode: '',
      Fininsbr: '',
      Payterm: '',
      Payinstr: '',
      Crtrn: '',
      Dirdr: '',
      Crday: '',
      Paidamt: '',
      PaymtDue: '',
    },
  };
}

const DRAFT_KEY = 'ramsoft-einvoice-enterprise-draft';

export function saveDraftToLocalStorage(value: EnterpriseEinvoiceFormValue): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(value));
  } catch {
    /* ignore quota */
  }
}

export function loadDraftFromLocalStorage(): EnterpriseEinvoiceFormValue | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as EnterpriseEinvoiceFormValue;
  } catch {
    return null;
  }
}

export function clearDraftFromLocalStorage(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}
