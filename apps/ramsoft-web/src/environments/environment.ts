import type { GstZenEnvironment } from './gstzen-environment';

/**
 * Local dev: browser calls same-origin `/gstzen-proxy/...`; `nx serve` forwards to
 * `https://my.gstzen.in/...` (see `apps/ramsoft-web/proxy.conf.mjs` and SSR handling in `server.ts`).
 * Production uses full URLs.
 */
const GSTZEN_DEV = '/gstzen-proxy';

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
    einvoiceGenUrl: `${GSTZEN_DEV}/~gstzen/a/post-einvoice-data/einvoice-json/`,
    einvoiceGenEwbUrl: `${GSTZEN_DEV}/~gstzen/a/post-einvoice-data/einvoice-json/genewb/`,
    einvoiceCancelUrl: undefined,
    einvoiceCancelEwbUrl: `${GSTZEN_DEV}/~gstzen/a/post-einvoice-data/einvoice-json/cancelewb/`,
    einvoiceGetByIrnUrl: `${GSTZEN_DEV}/~gstzen/a/post-einvoice-data/einvoice-json/geteinv/`,
    ewbGenerateUrl: `${GSTZEN_DEV}/~gstzen/a/ewbapi/generate/`,
    ewbCancelUrl: `${GSTZEN_DEV}/~gstzen/a/ewbapi/cancel/`,
    ewbGetUrl: `${GSTZEN_DEV}/~gstzen/a/ewbapi/getewb/`,
    ewbUpdatePartBUrl: `${GSTZEN_DEV}/~gstzen/a/ewbapi/update-partb/`,
    token: '0c2d0199-b1a5-494d-a2ef-f2b669d83738',
    ewbTestToken: 'de3a3a01-273a-4a81-8b75-13fe37f14dc6',
  } satisfies GstZenEnvironment,
};
