import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  GSTR1_GSTZEN_AUTH_CONFIG,
  GstzenHttpClient,
} from '@ramsoft-builder/gstr1/data-access/gstzen-auth';
import type { Gstr1aDownloadRequestBody } from '@ramsoft-builder/gstr1a/models/requests';

/**
 * Reusable GSTZen POST client for GSTR-1A.
 * Bearer: GSTR-1 `gstr1BearerInterceptor`.
 * Refer GSTR-1 authentication/session establishment flow (`/gstr1/login`).
 */
@Injectable({ providedIn: 'root' })
export class Gstr1aGstApiClient {
  private readonly http = inject(GstzenHttpClient);
  private readonly config = inject(GSTR1_GSTZEN_AUTH_CONFIG);

  download(body: Gstr1aDownloadRequestBody): Observable<unknown> {
    return this.http.postJson(this.config.gstr1aDownloadUrl, {
      gstin: body.gstin.trim().toUpperCase(),
      ret_period: body.ret_period.trim(),
      api_name: body.api_name,
    });
  }

  retsave(body: Record<string, unknown>): Observable<unknown> {
    return this.http.postJson(this.config.gstr1aRetsaveUrl, body);
  }
}
