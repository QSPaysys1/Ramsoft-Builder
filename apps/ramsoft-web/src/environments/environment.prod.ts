import type { GstZenEnvironment } from './gstzen-environment';

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
    token: '',
    ewbTestToken: undefined as string | undefined,
  } satisfies GstZenEnvironment,
};
