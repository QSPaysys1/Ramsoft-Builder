import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  GSTR1_GSTZEN_AUTH_CONFIG,
  GstzenHttpClient,
} from '@ramsoft-builder/gstr1/data-access/gstzen-auth';

function periodBody(
  gstin: string,
  ret_period: string,
): { gstin: string; ret_period: string } {
  return {
    gstin: gstin.trim().toUpperCase(),
    ret_period: ret_period.trim(),
  };
}

/**
 * Thin GSTZen POST wrapper for GSTR-2A read APIs.
 * Bearer token is attached by app-level `gstr1BearerInterceptor`.
 */
@Injectable({ providedIn: 'root' })
export class Gstr2aGstApiClient {
  private readonly http = inject(GstzenHttpClient);
  private readonly config = inject(GSTR1_GSTZEN_AUTH_CONFIG);

  postPeriodJson(url: string, gstin: string, ret_period: string): Observable<unknown> {
    return this.http.postJson(url, periodBody(gstin, ret_period));
  }

  get b2bUrl(): string {
    return this.config.gstr2B2bUrl;
  }

  get b2baUrl(): string {
    return this.config.gstr2B2baUrl;
  }

  get cdnUrl(): string {
    return this.config.gstr2CdnUrl;
  }

  get cdnaUrl(): string {
    return this.config.gstr2CdnaUrl;
  }

  get ecomUrl(): string {
    return this.config.gstr2EcomUrl;
  }

  get ecomaUrl(): string {
    return this.config.gstr2EcomaUrl;
  }

  get isdUrl(): string {
    return this.config.gstr2IsdUrl;
  }

  get tdstcsUrl(): string {
    return this.config.gstr2TdstcsUrl;
  }

  get impgUrl(): string {
    return this.config.gstr2ImpgUrl;
  }

  get impgsezUrl(): string {
    return this.config.gstr2ImpgsezUrl;
  }
}
