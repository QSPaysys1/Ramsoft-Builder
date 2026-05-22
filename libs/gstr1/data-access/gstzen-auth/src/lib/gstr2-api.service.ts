import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type { Gstr2B2bRequestBody } from './gstr2-b2b.models';
import type { Gstr2B2baRequestBody } from './gstr2-b2ba.models';
import type { Gstr2ImpgRequestBody } from './gstr2-impg.models';
import type { Gstr22bRequestBody } from './gstr2-2b.models';
import type { Gstr2ImpgsezRequestBody } from './gstr2-impgsez.models';
import type { Gstr2TdstcsRequestBody } from './gstr2-tdstcs.models';
import type { Gstr2IsdRequestBody } from './gstr2-isd.models';
import type { Gstr2EcomaRequestBody } from './gstr2-ecoma.models';
import type { Gstr2EcomRequestBody } from './gstr2-ecom.models';
import type { Gstr2CdnaRequestBody } from './gstr2-cdna.models';
import type { Gstr2CdnRequestBody } from './gstr2-cdn.models';
import { GSTR1_GSTZEN_AUTH_CONFIG } from './gstr1-gstzen-auth.config';
import { GstzenHttpClient } from './gstzen-http.client';

function periodBody(gstin: string, ret_period: string): { gstin: string; ret_period: string } {
  return {
    gstin: gstin.trim().toUpperCase(),
    ret_period: ret_period.trim(),
  };
}

/** GSTR-2 / GSTR-2A / GSTR-2B read APIs. */
@Injectable({ providedIn: 'root' })
export class Gstr2ApiService {
  private readonly http = inject(GstzenHttpClient);
  private readonly config = inject(GSTR1_GSTZEN_AUTH_CONFIG);

  fetchGstr2B2b(body: Gstr2B2bRequestBody): Observable<unknown> {
    return this.http.postJson(this.config.gstr2B2bUrl, periodBody(body.gstin, body.ret_period));
  }

  fetchGstr2B2ba(body: Gstr2B2baRequestBody): Observable<unknown> {
    return this.http.postJson(this.config.gstr2B2baUrl, periodBody(body.gstin, body.ret_period));
  }

  fetchGstr2Cdna(body: Gstr2CdnaRequestBody): Observable<unknown> {
    return this.http.postJson(this.config.gstr2CdnaUrl, periodBody(body.gstin, body.ret_period));
  }

  fetchGstr2Ecoma(body: Gstr2EcomaRequestBody): Observable<unknown> {
    return this.http.postJson(this.config.gstr2EcomaUrl, periodBody(body.gstin, body.ret_period));
  }

  fetchGstr2Ecom(body: Gstr2EcomRequestBody): Observable<unknown> {
    return this.http.postJson(this.config.gstr2EcomUrl, periodBody(body.gstin, body.ret_period));
  }

  fetchGstr2Isd(body: Gstr2IsdRequestBody): Observable<unknown> {
    return this.http.postJson(this.config.gstr2IsdUrl, periodBody(body.gstin, body.ret_period));
  }

  fetchGstr2Tdstcs(body: Gstr2TdstcsRequestBody): Observable<unknown> {
    return this.http.postJson(this.config.gstr2TdstcsUrl, periodBody(body.gstin, body.ret_period));
  }

  fetchGstr2Impg(body: Gstr2ImpgRequestBody): Observable<unknown> {
    return this.http.postJson(this.config.gstr2ImpgUrl, periodBody(body.gstin, body.ret_period));
  }

  fetchGstr2Impgsez(body: Gstr2ImpgsezRequestBody): Observable<unknown> {
    return this.http.postJson(this.config.gstr2ImpgsezUrl, periodBody(body.gstin, body.ret_period));
  }

  fetchGstr22b(body: Gstr22bRequestBody): Observable<unknown> {
    return this.http.postJson(this.config.gstr22bUrl, periodBody(body.gstin, body.ret_period));
  }

  fetchGstr2Cdn(body: Gstr2CdnRequestBody): Observable<unknown> {
    return this.http.postJson(this.config.gstr2CdnUrl, periodBody(body.gstin, body.ret_period));
  }
}
