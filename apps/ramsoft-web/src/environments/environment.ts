import type { GstZenEnvironment } from './gstzen-environment';

/**
 * Supabase: Dashboard → Project Settings → API.
 * `anonKey` may be the legacy JWT `anon` key or the newer `sb_publishable_...` key.
 */
export const environment = {
  production: false,
  supabase: {
    url: 'https://udkjepquezbpfropftca.supabase.co',
    anonKey:
      'sb_publishable_GT_Ys1iGtJhL6INxYTAcHA_57WG068C',
  },
  gstZen: {
    einvoiceGenUrl:
      'https://my.gstzen.in/~gstzen/a/post-einvoice-data/einvoice-json/',
    einvoiceGenEwbUrl:
      'https://my.gstzen.in/~gstzen/a/post-einvoice-data/einvoice-json/genewb/',
    einvoiceCancelUrl: undefined,
    einvoiceCancelEwbUrl:
      'https://my.gstzen.in/~gstzen/a/post-einvoice-data/einvoice-json/cancelewb/',
    einvoiceGetByIrnUrl:
      'https://my.gstzen.in/~gstzen/a/post-einvoice-data/einvoice-json/geteinv/',
    token: 'de3a3a01-273a-4a81-8b75-13fe37f14dc6',
  } satisfies GstZenEnvironment,
};
