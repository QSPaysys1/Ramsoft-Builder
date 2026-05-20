import type { GstZenEnvironment } from './gstzen-environment';
import type { Gstr1Environment } from './gstr1-environment';

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
    ewbUpdateTransporterUrl: `${GSTZEN_DEV}/~gstzen/a/ewbapi/update-transporter/`,
    ewbExtendUrl: `${GSTZEN_DEV}/~gstzen/a/ewbapi/extend/`,
    ewbMultiVehicleUrl: undefined as string | undefined,
    ewbMvGroupPostUrl: `${GSTZEN_DEV}/~gstzen/a/ewbapi/add-multi-vehicles/`,
    ewbChangeMultiVehiclesUrl: `${GSTZEN_DEV}/~gstzen/a/ewbapi/change-multi-vehicles/`,
    ewbGetTransporterViewUrl: `${GSTZEN_DEV}/~gstzen/a/ewbapi/get-ewb-transporter-view/`,
    ewbGetTransporterStateViewUrl: `${GSTZEN_DEV}/~gstzen/a/ewbapi/get-ewb-transporter-state-view/`,
    ewbGetTransporterGstinViewUrl: `${GSTZEN_DEV}/~gstzen/a/ewbapi/get-ewb-transporter-gstin-view/`,
    token: '0c2d0199-b1a5-494d-a2ef-f2b669d83738',
    ewbTestToken: 'de3a3a01-273a-4a81-8b75-13fe37f14dc6',
  } satisfies GstZenEnvironment,
  gstr1: {
    loginTokenUrl: `${GSTZEN_DEV}/accounts/api/login/token/`,
    bearerUrlPrefixes: [GSTZEN_DEV],
    unauthorizedUrlPrefixes: [GSTZEN_DEV],
    accessTokenFallbackTtlMs: 86_400_000,
    gstnGenerateOtpUrl: `${GSTZEN_DEV}/api/gstn-generate-otp/`,
    gstnEstablishSessionUrl: `${GSTZEN_DEV}/api/gstn-establish-session/`,
    gstnCheckSessionUrl: `${GSTZEN_DEV}/api/gstn-check-session/`,
    gstnRefreshSessionUrl: `${GSTZEN_DEV}/api/gstn-refresh-session/`,
    gstnRetStatusUrl: `${GSTZEN_DEV}/api/retstatus/`,
    gstnRettrackUrl: `${GSTZEN_DEV}/api/rettrack/`,
    gstr1DownloadUrl: `${GSTZEN_DEV}/api/gstr1/download/`,
    gstr1aDownloadUrl: `${GSTZEN_DEV}/api/gstr1a/download/`,
    gstr1ResetUrl: `${GSTZEN_DEV}/api/gstr1/reset/`,
    gstr1RetsaveUrl: `${GSTZEN_DEV}/api/gstr1/retsave/`,
    gstr1aRetsaveUrl: `${GSTZEN_DEV}/api/gstr1a/retsave/`,
    gstr2B2bUrl: `${GSTZEN_DEV}/api/gstr2/b2b/`,
    gstr2B2baUrl: `${GSTZEN_DEV}/api/gstr2/b2ba/`,
    gstr2CdnaUrl: `${GSTZEN_DEV}/api/gstr2/cdna/`,
    gstr2EcomUrl: `${GSTZEN_DEV}/api/gstr2/ecom/`,
    gstr2EcomaUrl: `${GSTZEN_DEV}/api/gstr2/ecoma/`,
    gstr2IsdUrl: `${GSTZEN_DEV}/api/gstr2/isd/`,
    gstr2TdstcsUrl: `${GSTZEN_DEV}/api/gstr2/tdstcs/`,
    gstr2ImpgUrl: `${GSTZEN_DEV}/api/gstr2/impg/`,
    gstr2ImpgsezUrl: `${GSTZEN_DEV}/api/gstr2/impgsez/`,
    gstr2CdnUrl: `${GSTZEN_DEV}/api/gstr2/cdn/`,
  } satisfies Gstr1Environment,
};
