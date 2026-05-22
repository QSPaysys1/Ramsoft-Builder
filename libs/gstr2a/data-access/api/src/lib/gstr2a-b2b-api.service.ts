import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type { Gstr2aB2bRequestBody } from '@ramsoft-builder/gstr2a/models/requests';
import { Gstr2aGstApiClient } from './gstr2a-gst-api.client';

/** GSTR-2A B2B supplier summary API. */
@Injectable({ providedIn: 'root' })
export class Gstr2aB2bApiService {
  private readonly client = inject(Gstr2aGstApiClient);

  fetch(body: Gstr2aB2bRequestBody): Observable<unknown> {
    return this.client.postPeriodJson(
      this.client.b2bUrl,
      body.gstin,
      body.ret_period,
    );
  }
}
