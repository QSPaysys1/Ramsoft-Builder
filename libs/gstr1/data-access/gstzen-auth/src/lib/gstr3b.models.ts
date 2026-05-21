/**
 * GSTZen `POST /api/gstr3b/autoliab/` — GSTR-3B auto-liability (Bearer).
 */
export interface Gstr3bAutoliabRequestBody {
  readonly gstin: string;
  readonly ret_period: string;
}

/** GSTZen `POST /api/gstr3b/retsum/` — saved return summary (Bearer). */
export interface Gstr3bRetsumRequestBody {
  readonly gstin: string;
  readonly ret_period: string;
}

export interface Gstr3bTaxAmounts {
  readonly igst: string;
  readonly cgst: string;
  readonly sgst: string;
  readonly cess: string;
}

export interface Gstr3bInterStateAmounts {
  readonly taxableValue: string;
  readonly igst: string;
}

export interface Gstr3bExemptAmounts {
  readonly interState: string;
  readonly intraState: string;
}

export interface Gstr3bPaymentAmounts {
  readonly balanceLiability: string;
  readonly paidThroughCash: string;
  readonly paidThroughCredit: string;
}

export interface Gstr3bAutoliabMeta {
  readonly gstin: string;
  readonly returnPeriod: string;
  readonly r1FileDate: string;
  readonly r2bGenDate: string;
  readonly r3bGenDate: string;
}

export interface Gstr3bAutoliabBundle {
  readonly meta: Gstr3bAutoliabMeta;
  readonly table31: Gstr3bTaxAmounts;
  readonly table311: Gstr3bTaxAmounts;
  readonly table32: Gstr3bInterStateAmounts;
  readonly table4: Gstr3bTaxAmounts;
  readonly table5: Gstr3bExemptAmounts;
  readonly table51: Gstr3bTaxAmounts;
  readonly table61: Gstr3bPaymentAmounts;
}

/** GSTZen `POST /api/gstr3b/retsave/` — tax line with all five columns. */
export interface Gstr3bRetsaveFullTaxLine {
  txval: number;
  iamt: number;
  camt: number;
  samt: number;
  csamt: number;
}

export interface Gstr3bRetsaveZeroRatedLine {
  txval: number;
  iamt: number;
  csamt: number;
}

export interface Gstr3bRetsaveTxvalLine {
  txval: number;
}

export interface Gstr3bRetsaveInterSupRow {
  pos: string;
  txval: number;
  iamt: number;
}

export interface Gstr3bRetsaveItcRow {
  ty: string;
  iamt: number;
  camt: number;
  samt: number;
  csamt: number;
}

export interface Gstr3bRetsaveItcTaxOnly {
  iamt: number;
  camt: number;
  samt: number;
  csamt: number;
}

export interface Gstr3bRetsaveInwardSupRow {
  ty: string;
  inter: number;
  intra: number;
}

export interface Gstr3bSupDetails {
  osup_det: Gstr3bRetsaveFullTaxLine;
  osup_zero: Gstr3bRetsaveZeroRatedLine;
  osup_nil_exmp: Gstr3bRetsaveTxvalLine;
  isup_rev: Gstr3bRetsaveFullTaxLine;
  osup_nongst: Gstr3bRetsaveTxvalLine;
}

export interface Gstr3bEcoDetails {
  eco_sup: Gstr3bRetsaveFullTaxLine;
  eco_reg_sup: Gstr3bRetsaveTxvalLine;
}

export interface Gstr3bRetsaveFormState {
  sup_details: Gstr3bSupDetails;
  inter_sup: {
    unreg_details: Gstr3bRetsaveInterSupRow[];
    comp_details: Gstr3bRetsaveInterSupRow[];
    uin_details: Gstr3bRetsaveInterSupRow[];
  };
  eco_dtls: Gstr3bEcoDetails;
  itc_elg: {
    itc_avl: Gstr3bRetsaveItcRow[];
    itc_rev: Gstr3bRetsaveItcRow[];
    itc_net: Gstr3bRetsaveItcTaxOnly;
    itc_inelg: Gstr3bRetsaveItcRow[];
  };
  inward_sup: {
    isup_details: Gstr3bRetsaveInwardSupRow[];
  };
  intr_ltfee: {
    intr_details: Gstr3bRetsaveItcTaxOnly;
  };
}

export interface Gstr3bRetsaveRequestBody extends Gstr3bRetsaveFormState {
  readonly ret_period: string;
  readonly gstin: string;
}
