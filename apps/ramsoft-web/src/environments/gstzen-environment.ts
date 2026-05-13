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
  /**
   * Standalone e-way bill generate (`ewbapi/generate/`).
   * Default: `https://my.gstzen.in/~gstzen/a/ewbapi/generate/`
   */
  ewbGenerateUrl?: string;
  /**
   * Standalone e-way bill cancel (`ewbapi/cancel/`).
   * Default: `https://my.gstzen.in/~gstzen/a/ewbapi/cancel/`
   */
  ewbCancelUrl?: string;
  /**
   * Standalone fetch e-way bill by number (`ewbapi/getewb/`).
   * Default: `https://my.gstzen.in/~gstzen/a/ewbapi/getewb/`
   */
  ewbGetUrl?: string;
  /**
   * Standalone update Part B (`ewbapi/updatepartb/`).
   * Default: `https://my.gstzen.in/~gstzen/a/ewbapi/updatepartb/`
   * @see https://my.gstzen.in/docs/api/ewaybill-api/update-partb/
   */
  ewbUpdatePartBUrl?: string;
  /** API `Token` header (primary / “original” GSTZen token). */
  token: string;
  /** Optional token used only for standalone e-way testing when the app toggle is on. */
  ewbTestToken?: string;
}
