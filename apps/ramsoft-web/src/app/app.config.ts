import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app.routes';
import {
  provideClientHydration,
  withEventReplay,
} from '@angular/platform-browser';
import { provideSupabaseClient } from '@ramsoft-builder/shared/data-access/supabase';
import { GSTZEN_EWB_HTTP_CONFIG } from '@ramsoft-builder/ewaybills/data-access/ewb';
import { GSTZEN_EINVOICE_CONFIG } from '@ramsoft-builder/e-invoices/data-access/einvoice';
import { EINVOICE_GSTZEN_HTTP_CONFIG } from '@ramsoft-builder/einvoice/data-access/api';
import {
  gstr1BearerInterceptor,
  gstr1UnauthorizedInterceptor,
  provideGstr1GstzenAuthConfig,
} from '@ramsoft-builder/gstr1/data-access/gstzen-auth';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    ...provideSupabaseClient(environment.supabase),
    provideHttpClient(
      withFetch(),
      withInterceptors([gstr1BearerInterceptor, gstr1UnauthorizedInterceptor]),
    ),
    provideGstr1GstzenAuthConfig({
      loginTokenUrl: environment.gstr1.loginTokenUrl,
      bearerUrlPrefixes: environment.gstr1.bearerUrlPrefixes,
      unauthorizedUrlPrefixes: environment.gstr1.unauthorizedUrlPrefixes,
      accessTokenFallbackTtlMs: environment.gstr1.accessTokenFallbackTtlMs,
      gstnGenerateOtpUrl: environment.gstr1.gstnGenerateOtpUrl,
      gstnEstablishSessionUrl: environment.gstr1.gstnEstablishSessionUrl,
      gstnCheckSessionUrl: environment.gstr1.gstnCheckSessionUrl,
      gstnRefreshSessionUrl: environment.gstr1.gstnRefreshSessionUrl,
      gstnRetStatusUrl: environment.gstr1.gstnRetStatusUrl,
      gstnRettrackUrl: environment.gstr1.gstnRettrackUrl,
      gstr1DownloadUrl: environment.gstr1.gstr1DownloadUrl,
      gstr1aDownloadUrl: environment.gstr1.gstr1aDownloadUrl,
      gstr1ResetUrl: environment.gstr1.gstr1ResetUrl,
      gstr1RetsaveUrl: environment.gstr1.gstr1RetsaveUrl,
      gstr1aRetsaveUrl: environment.gstr1.gstr1aRetsaveUrl,
      gstr2B2bUrl: environment.gstr1.gstr2B2bUrl,
      gstr2B2baUrl: environment.gstr1.gstr2B2baUrl,
      gstr2CdnUrl: environment.gstr1.gstr2CdnUrl,
    }),
    {
      provide: GSTZEN_EINVOICE_CONFIG,
      useValue: {
        einvoiceGenUrl: environment.gstZen.einvoiceGenUrl,
        einvoiceCancelUrl: environment.gstZen.einvoiceCancelUrl,
        token: environment.gstZen.token,
      },
    },
    {
      provide: EINVOICE_GSTZEN_HTTP_CONFIG,
      useValue: {
        einvoiceGenUrl: environment.gstZen.einvoiceGenUrl,
        einvoiceGenEwbUrl: environment.gstZen.einvoiceGenEwbUrl,
        einvoiceCancelUrl: environment.gstZen.einvoiceCancelUrl,
        einvoiceCancelEwbUrl: environment.gstZen.einvoiceCancelEwbUrl,
        einvoiceGetByIrnUrl: environment.gstZen.einvoiceGetByIrnUrl,
        token: environment.gstZen.token,
      },
    },
    {
      provide: GSTZEN_EWB_HTTP_CONFIG,
      useValue: {
        generateUrl:
          environment.gstZen.ewbGenerateUrl?.trim() ||
          'https://my.gstzen.in/~gstzen/a/ewbapi/generate/',
        cancelUrl:
          environment.gstZen.ewbCancelUrl?.trim() ||
          'https://my.gstzen.in/~gstzen/a/ewbapi/cancel/',
        getUrl:
          environment.gstZen.ewbGetUrl?.trim() ||
          'https://my.gstzen.in/~gstzen/a/ewbapi/getewb/',
        updatePartBUrl:
          environment.gstZen.ewbUpdatePartBUrl?.trim() ||
          'https://my.gstzen.in/~gstzen/a/ewbapi/update-partb/',
        updateTransporterUrl:
          environment.gstZen.ewbUpdateTransporterUrl?.trim() ||
          'https://my.gstzen.in/~gstzen/a/ewbapi/update-transporter/',
        extendUrl:
          environment.gstZen.ewbExtendUrl?.trim() ||
          'https://my.gstzen.in/~gstzen/a/ewbapi/extend/',
        multiVehicleUrl: environment.gstZen.ewbMultiVehicleUrl?.trim() || undefined,
        mvGroupPostUrl: environment.gstZen.ewbMvGroupPostUrl?.trim() || undefined,
        changeMultiVehiclesUrl:
          environment.gstZen.ewbChangeMultiVehiclesUrl?.trim() || undefined,
        getTransporterViewUrl:
          environment.gstZen.ewbGetTransporterViewUrl?.trim() ||
          'https://my.gstzen.in/~gstzen/a/ewbapi/get-ewb-transporter-view/',
        getTransporterStateViewUrl:
          environment.gstZen.ewbGetTransporterStateViewUrl?.trim() ||
          'https://my.gstzen.in/~gstzen/a/ewbapi/get-ewb-transporter-state-view/',
        getTransporterGstinViewUrl:
          environment.gstZen.ewbGetTransporterGstinViewUrl?.trim() ||
          'https://my.gstzen.in/~gstzen/a/ewbapi/get-ewb-transporter-gstin-view/',
        token: environment.gstZen.token,
        ewbTestToken: environment.gstZen.ewbTestToken?.trim() || undefined,
      },
    },
    provideClientHydration(withEventReplay()),
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(appRoutes),
  ],
};
