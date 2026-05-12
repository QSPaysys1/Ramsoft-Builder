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
    token: '',
  } satisfies GstZenEnvironment,
};
