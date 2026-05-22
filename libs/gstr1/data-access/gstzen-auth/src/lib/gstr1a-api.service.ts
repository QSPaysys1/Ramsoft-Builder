import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type { Gstr1aDownloadRequestBody } from './gstr1-download.models';
import { GSTR1_GSTZEN_AUTH_CONFIG } from './gstr1-gstzen-auth.config';
import { GstzenHttpClient } from './gstzen-http.client';

/** GSTR-1A download and retsave APIs. */
@Injectable({ providedIn: 'root' })
export class Gstr1aApiService {
  private readonly http = inject(GstzenHttpClient);
  private readonly config = inject(GSTR1_GSTZEN_AUTH_CONFIG);

  downloadGstr1aReturn(body: Gstr1aDownloadRequestBody): Observable<unknown> {
    return this.http.postJson(this.config.gstr1aDownloadUrl, {
      gstin: body.gstin.trim().toUpperCase(),
      ret_period: body.ret_period.trim(),
      api_name: body.api_name,
    });
  }

  retsaveGstr1aReturn(body: Record<string, unknown>): Observable<unknown> {
    return this.http.postJson(this.config.gstr1aRetsaveUrl, body);
  }
}
