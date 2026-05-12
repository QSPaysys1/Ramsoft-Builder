import { InjectionToken } from '@angular/core';

/**
 * GSTZen NIC IRN cancel POST URL — matches legacy usaccounting
 * `invoicefv.component.ts` (`https://.../einvoice-json/cancel/`).
 */
export const GSTZEN_EINVOICE_CANCEL_URL =
  'https://my.gstzen.in/~gstzen/a/post-einvoice-data/einvoice-json/cancel/';

/** Runtime GSTZen HTTP settings (provided from `apps/ramsoft-web` `environment`). */
export interface GstZenEinvoiceConfig {
  einvoiceGenUrl: string;
  /**
   * Override cancel URL; when unset, {@link GSTZEN_EINVOICE_CANCEL_URL} is used
   * (same as usaccounting invoicefv).
   */
  einvoiceCancelUrl?: string;
  token: string;
}

/** Resolves cancel POST URL: explicit config wins, else {@link GSTZEN_EINVOICE_CANCEL_URL}. */
export function resolveGstZenEinvoiceCancelUrl(
  config: Pick<GstZenEinvoiceConfig, 'einvoiceCancelUrl'>,
): string {
  return (config.einvoiceCancelUrl?.trim() || GSTZEN_EINVOICE_CANCEL_URL).trim();
}

export const GSTZEN_EINVOICE_CONFIG = new InjectionToken<GstZenEinvoiceConfig>(
  'GSTZEN_EINVOICE_CONFIG',
);
