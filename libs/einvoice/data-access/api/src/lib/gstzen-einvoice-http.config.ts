import { InjectionToken } from '@angular/core';

/** GSTZen HTTP settings for the enterprise `einvoice` domain (IRN + genewb). */
export interface EinvoiceGstZenHttpConfig {
  /** IRN-only generation URL (POST body = NIC JSON). */
  einvoiceGenUrl: string;
  /** IRN + e-way bill combined generation URL. */
  einvoiceGenEwbUrl: string;
  einvoiceCancelUrl?: string;
  /** IRN + e-way bill combined cancel (`cancelewb`). */
  einvoiceCancelEwbUrl?: string;
  /** Fetch signed e-invoice JSON by IRN (`geteinv`). */
  einvoiceGetByIrnUrl?: string;
  token: string;
}

export const EINVOICE_GSTZEN_HTTP_CONFIG =
  new InjectionToken<EinvoiceGstZenHttpConfig>('EINVOICE_GSTZEN_HTTP_CONFIG');

export const GSTZEN_EINVOICE_CANCEL_DEFAULT =
  'https://my.gstzen.in/~gstzen/a/post-einvoice-data/einvoice-json/cancel/';

export const GSTZEN_EINVOICE_CANCEL_EWB_DEFAULT =
  'https://my.gstzen.in/~gstzen/a/post-einvoice-data/einvoice-json/cancelewb/';

/** GSTZen “get e-invoice by IRN” (`geteinv`) POST URL. */
export const GSTZEN_EINVOICE_GET_BY_IRN_DEFAULT =
  'https://my.gstzen.in/~gstzen/a/post-einvoice-data/einvoice-json/geteinv/';

export function resolveEinvoiceCancelUrl(
  config: Pick<EinvoiceGstZenHttpConfig, 'einvoiceCancelUrl'>,
): string {
  return (config.einvoiceCancelUrl?.trim() || GSTZEN_EINVOICE_CANCEL_DEFAULT).trim();
}

export function resolveEinvoiceCancelEwbUrl(
  config: Pick<EinvoiceGstZenHttpConfig, 'einvoiceCancelEwbUrl'>,
): string {
  return (config.einvoiceCancelEwbUrl?.trim() || GSTZEN_EINVOICE_CANCEL_EWB_DEFAULT).trim();
}

export function resolveEinvoiceGetByIrnUrl(
  config: Pick<EinvoiceGstZenHttpConfig, 'einvoiceGetByIrnUrl'>,
): string {
  return (config.einvoiceGetByIrnUrl?.trim() || GSTZEN_EINVOICE_GET_BY_IRN_DEFAULT).trim();
}
