import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  GSTR1_GSTZEN_AUTH_CONFIG,
  GstzenHttpClient,
} from '@ramsoft-builder/gstr1/data-access/gstzen-auth';
import type {
  Gstr3bAutoliabRequestBody,
  Gstr3bRetsumRequestBody,
} from '@ramsoft-builder/gstr3b/models/requests';
import type { Gstr3bRetsaveRequestBody } from '@ramsoft-builder/gstr3b/models/entities';

/**
 * Reusable GSTZen POST client for GSTR-3B.
 * Bearer: GSTR-1 `gstr1BearerInterceptor`.
 */
@Injectable({ providedIn: 'root' })
export class Gstr3bGstApiClient {
  private readonly http = inject(GstzenHttpClient);
  private readonly config = inject(GSTR1_GSTZEN_AUTH_CONFIG);

  fetchAutoliab(body: Gstr3bAutoliabRequestBody): Observable<unknown> {
    return this.http.postJson(this.config.gstr3bAutoliabUrl, {
      gstin: body.gstin.trim().toUpperCase(),
      ret_period: body.ret_period.trim(),
    });
  }

  fetchRetsum(body: Gstr3bRetsumRequestBody): Observable<unknown> {
    return this.http.postJson(this.config.gstr3bRetsumUrl, {
      gstin: body.gstin.trim().toUpperCase(),
      ret_period: body.ret_period.trim(),
    });
  }

  retsave(body: Gstr3bRetsaveRequestBody): Observable<unknown> {
    return this.http.postJson(this.config.gstr3bRetsaveUrl, body);
  }
}
