import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  Gstr3bAutoliabRequestBody,
  Gstr3bRetsumRequestBody,
} from '@ramsoft-builder/gstr3b/models/requests';
import type { Gstr3bRetsaveRequestBody } from '@ramsoft-builder/gstr3b/models/entities';
import { Gstr3bGstApiClient } from './gstr3b-gst-api.client';

/** Alias matching legacy `Gstr3bApiService` method names. */
@Injectable({ providedIn: 'root' })
export class Gstr3bApiService {
  private readonly client = inject(Gstr3bGstApiClient);

  fetchGstr3bAutoliab(body: Gstr3bAutoliabRequestBody): Observable<unknown> {
    return this.client.fetchAutoliab(body);
  }

  retsaveGstr3bReturn(body: Gstr3bRetsaveRequestBody): Observable<unknown> {
    return this.client.retsave(body);
  }

  fetchGstr3bRetsum(body: Gstr3bRetsumRequestBody): Observable<unknown> {
    return this.client.fetchRetsum(body);
  }
}
