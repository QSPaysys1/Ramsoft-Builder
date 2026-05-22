import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Gstr3bGstApiClient } from '@ramsoft-builder/gstr3b/data-access/api';
import type {
  Gstr3bAutoliabRequestBody,
  Gstr3bRetsaveRequestBody,
  Gstr3bRetsumRequestBody,
} from '@ramsoft-builder/gstr3b/models/requests';
import type { Gstr3bRetsaveRequestBody as RetsaveBody } from '@ramsoft-builder/gstr3b/models/entities';

/** Backward-compatible wrapper around {@link Gstr3bGstApiClient}. */
@Injectable({ providedIn: 'root' })
export class Gstr3bApiService {
  private readonly client = inject(Gstr3bGstApiClient);

  fetchGstr3bAutoliab(body: Gstr3bAutoliabRequestBody): Observable<unknown> {
    return this.client.fetchAutoliab(body);
  }

  retsaveGstr3bReturn(body: RetsaveBody): Observable<unknown> {
    return this.client.retsave(body);
  }

  fetchGstr3bRetsum(body: Gstr3bRetsumRequestBody): Observable<unknown> {
    return this.client.fetchRetsum(body);
  }
}
