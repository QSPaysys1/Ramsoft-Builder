/** GSTZen e-invoice HTTP API. */
export interface GstZenEnvironment {
  /** Full POST URL including path (swap if GSTZen documents a different host/path). */
  einvoiceGenUrl: string;
  /** IRN + e-way bill combined generation (GSTZen `genewb`). */
  einvoiceGenEwbUrl: string;
  /**
   * Optional override for cancel POST. When omitted, the app uses the fixed GSTZen URL
   * from usaccounting `invoicefv.component.ts`:
   * `https://my.gstzen.in/~gstzen/a/post-einvoice-data/einvoice-json/cancel/`.
   */
  einvoiceCancelUrl?: string;
  /** IRN + e-way bill combined cancel POST (`cancelewb`). */
  einvoiceCancelEwbUrl?: string;
  /** Optional override for “get e-invoice by IRN” (`geteinv`). */
  einvoiceGetByIrnUrl?: string;
  /** API `Token` header; use a proxy or CI secrets in production — never commit live tokens. */
  token: string;
}
