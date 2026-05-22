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
 * Reusable GSTZen POST client for GSTR-2B.
 * Bearer token: app-level `gstr1BearerInterceptor` (shared GSTR-1 session).
 */
@Injectable({ providedIn: 'root' })
export class Gstr2bGstApiClient {
  private readonly http = inject(GstzenHttpClient);
  private readonly config = inject(GSTR1_GSTZEN_AUTH_CONFIG);

  postPeriodJson(url: string, gstin: string, ret_period: string): Observable<unknown> {
    return this.http.postJson(url, periodBody(gstin, ret_period));
  }

  get statementUrl(): string {
    return this.config.gstr22bUrl;
  }
}
