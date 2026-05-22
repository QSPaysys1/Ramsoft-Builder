import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  Gstr1DownloadRequestBody,
  Gstr1ResetRequestBody,
} from './gstr1-download.models';
import { GSTR1_GSTZEN_AUTH_CONFIG } from './gstr1-gstzen-auth.config';
import { GstzenHttpClient } from './gstzen-http.client';

/** GSTR-1 download, retsave, and proceed-to-file APIs. */
@Injectable({ providedIn: 'root' })
export class Gstr1ApiService {
  private readonly http = inject(GstzenHttpClient);
  private readonly config = inject(GSTR1_GSTZEN_AUTH_CONFIG);

  downloadGstr1Return(body: Gstr1DownloadRequestBody): Observable<unknown> {
    return this.http.postJson(this.config.gstr1DownloadUrl, {
      gstin: body.gstin.trim().toUpperCase(),
      ret_period: body.ret_period.trim(),
      api_name: body.api_name,
    });
  }

  resetGstr1Proceed(body: Gstr1ResetRequestBody): Observable<unknown> {
    return this.http.postJson(this.config.gstr1ResetUrl, {
      gstin: body.gstin.trim().toUpperCase(),
      ret_period: body.ret_period.trim(),
    });
  }

  retsaveGstr1Return(body: Record<string, unknown>): Observable<unknown> {
    return this.http.postJson(this.config.gstr1RetsaveUrl, body);
  }
}
