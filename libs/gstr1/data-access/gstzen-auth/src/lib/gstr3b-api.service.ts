import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  Gstr3bAutoliabRequestBody,
  Gstr3bRetsaveRequestBody,
  Gstr3bRetsumRequestBody,
} from './gstr3b.models';
import { GSTR1_GSTZEN_AUTH_CONFIG } from './gstr1-gstzen-auth.config';
import { GstzenHttpClient } from './gstzen-http.client';

/** GSTR-3B APIs (autoliab, retsave, retsum). */
@Injectable({ providedIn: 'root' })
export class Gstr3bApiService {
  private readonly http = inject(GstzenHttpClient);
  private readonly config = inject(GSTR1_GSTZEN_AUTH_CONFIG);

  fetchGstr3bAutoliab(body: Gstr3bAutoliabRequestBody): Observable<unknown> {
    return this.http.postJson(this.config.gstr3bAutoliabUrl, {
      gstin: body.gstin.trim().toUpperCase(),
      ret_period: body.ret_period.trim(),
    });
  }

  retsaveGstr3bReturn(body: Gstr3bRetsaveRequestBody): Observable<unknown> {
    return this.http.postJson(this.config.gstr3bRetsaveUrl, body);
  }

  fetchGstr3bRetsum(body: Gstr3bRetsumRequestBody): Observable<unknown> {
    return this.http.postJson(this.config.gstr3bRetsumUrl, {
      gstin: body.gstin.trim().toUpperCase(),
      ret_period: body.ret_period.trim(),
    });
  }
}
