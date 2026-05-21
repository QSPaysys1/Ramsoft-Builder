/**
 * GSTZen `POST /api/gstr3b/autoliab/` — GSTR-3B auto-liability (Bearer).
 */
export interface Gstr3bAutoliabRequestBody {
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
