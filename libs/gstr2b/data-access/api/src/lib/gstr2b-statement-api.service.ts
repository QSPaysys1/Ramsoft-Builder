import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type { Gstr22bRequestBody } from '@ramsoft-builder/gstr2b/models/requests';
import { Gstr2bGstApiClient } from './gstr2b-gst-api.client';

/** Single GSTR-2B statement API (`POST /api/gstr2/2b/`). */
@Injectable({ providedIn: 'root' })
export class Gstr2bStatementApiService {
  private readonly client = inject(Gstr2bGstApiClient);

  fetch(body: Gstr22bRequestBody): Observable<unknown> {
    return this.client.postPeriodJson(
      this.client.statementUrl,
      body.gstin,
      body.ret_period,
    );
  }
}
