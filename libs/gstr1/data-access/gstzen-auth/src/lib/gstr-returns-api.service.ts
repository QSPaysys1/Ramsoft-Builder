import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type { GstnRetStatusRequestBody } from './gstn-ret-status.models';
import type { GstnRettrackRequestBody } from './gstn-rettrack.models';
import { GSTR1_GSTZEN_AUTH_CONFIG } from './gstr1-gstzen-auth.config';
import { GstzenHttpClient } from './gstzen-http.client';

/** Return tracking and status APIs shared across GSTR families. */
@Injectable({ providedIn: 'root' })
export class GstrReturnsApiService {
  private readonly http = inject(GstzenHttpClient);
  private readonly config = inject(GSTR1_GSTZEN_AUTH_CONFIG);

  viewAndTrackReturns(body: GstnRettrackRequestBody): Observable<unknown> {
    return this.http.postJson(this.config.gstnRettrackUrl, {
      gstin: body.gstin.trim().toUpperCase(),
      ret_period: body.ret_period.trim(),
    });
  }

  getReturnStatus(body: GstnRetStatusRequestBody): Observable<unknown> {
    return this.http.postJson(this.config.gstnRetStatusUrl, {
      gstin: body.gstin.trim().toUpperCase(),
      ret_period: body.ret_period.trim(),
      reference_id: body.reference_id.trim(),
    });
  }
}
