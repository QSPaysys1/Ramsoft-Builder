import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type { Gstr1aDownloadRequestBody } from '@ramsoft-builder/gstr1a/models/requests';
import { Gstr1aGstApiClient } from './gstr1a-gst-api.client';

/** Legacy-compatible facade over {@link Gstr1aGstApiClient}. */
@Injectable({ providedIn: 'root' })
export class Gstr1aApiService {
  private readonly client = inject(Gstr1aGstApiClient);

  downloadGstr1aReturn(body: Gstr1aDownloadRequestBody): Observable<unknown> {
    return this.client.download(body);
  }

  retsaveGstr1aReturn(body: Record<string, unknown>): Observable<unknown> {
    return this.client.retsave(body);
  }
}
