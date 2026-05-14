import type { GstZenEnvironment } from './gstzen-environment';
import type { Gstr1Environment } from './gstr1-environment';

export const environment = {
  production: true,
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
    ewbGenerateUrl: 'https://my.gstzen.in/~gstzen/a/ewbapi/generate/',
    ewbCancelUrl: 'https://my.gstzen.in/~gstzen/a/ewbapi/cancel/',
    ewbGetUrl: 'https://my.gstzen.in/~gstzen/a/ewbapi/getewb/',
    ewbUpdatePartBUrl: 'https://my.gstzen.in/~gstzen/a/ewbapi/updatepartb/',
    ewbUpdateTransporterUrl:
      'https://my.gstzen.in/~gstzen/a/ewbapi/update-transporter/',
    ewbExtendUrl: 'https://my.gstzen.in/~gstzen/a/ewbapi/extend/',
    ewbMultiVehicleUrl: undefined as string | undefined,
    ewbMvGroupPostUrl: undefined as string | undefined,
    ewbChangeMultiVehiclesUrl: undefined as string | undefined,
    ewbGetTransporterViewUrl:
      'https://my.gstzen.in/~gstzen/a/ewbapi/get-ewb-transporter-view/',
    ewbGetTransporterStateViewUrl:
      'https://my.gstzen.in/~gstzen/a/ewbapi/get-ewb-transporter-state-view/',
    ewbGetTransporterGstinViewUrl:
      'https://my.gstzen.in/~gstzen/a/ewbapi/get-ewb-transporter-gstin-view/',
    token: '',
    ewbTestToken: undefined as string | undefined,
  } satisfies GstZenEnvironment,
  gstr1: {
    loginTokenUrl: 'https://my.gstzen.in/accounts/api/login/token/',
    bearerUrlPrefixes: ['https://my.gstzen.in'],
    unauthorizedUrlPrefixes: ['https://my.gstzen.in'],
    accessTokenFallbackTtlMs: 86_400_000,
    gstnGenerateOtpUrl: 'https://my.gstzen.in/api/gstn-generate-otp/',
    gstnEstablishSessionUrl: 'https://my.gstzen.in/api/gstn-establish-session/',
    gstnCheckSessionUrl: 'https://my.gstzen.in/api/gstn-check-session/',
    gstnRefreshSessionUrl: 'https://my.gstzen.in/api/gstn-refresh-session/',
    gstnRetStatusUrl: 'https://my.gstzen.in/api/retstatus/',
    gstnRettrackUrl: 'https://my.gstzen.in/api/rettrack/',
  } satisfies Gstr1Environment,
};
