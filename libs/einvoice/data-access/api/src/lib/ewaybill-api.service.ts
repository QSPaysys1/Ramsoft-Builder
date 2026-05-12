import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { EinvoiceGenerateRequest, EinvoiceGenerateResponse } from '@ramsoft-builder/einvoice/models/nic';
import { catchError, map, Observable, throwError } from 'rxjs';
import { EinvoiceEnterpriseApiError } from './einvoice-enterprise-api-error';
import { EinvoiceApiService } from './einvoice-api.service';
import { assertGstZenCancelJsonResponse, mapGstZenHttpError } from './gstzen-cancel-http';
import {
  EINVOICE_GSTZEN_HTTP_CONFIG,
  resolveEinvoiceCancelEwbUrl,
} from './gstzen-einvoice-http.config';

/**
 * E-way bill operations (GSTZen). IRN+EWB combined generation uses `genewb`;
 * IRN+EWB cancel uses `cancelewb`.
 */
@Injectable({ providedIn: 'root' })
export class EwaybillApiService {
  private readonly http = inject(HttpClient);
  private readonly cfg = inject(EINVOICE_GSTZEN_HTTP_CONFIG);
  private readonly einvoiceApi = inject(EinvoiceApiService);

  /** POST NIC root JSON including `EwbDtls` to GSTZen `genewb`. */
  generateIrnWithEwayBill(
    body: EinvoiceGenerateRequest,
  ): Observable<EinvoiceGenerateResponse> {
    return this.einvoiceApi.postGenerateRaw(this.cfg.einvoiceGenEwbUrl, body);
  }

  /**
   * Cancel IRN together with e-way bill — POST to GSTZen `cancelewb/`.
   * Body shape must match GSTZen documentation (typically original generate JSON plus cancel fields).
   */
  cancelIrnWithEwayBill(body: Record<string, unknown>): Observable<Record<string, unknown>> {
    const token = this.cfg.token?.trim();
    if (!token) {
      return throwError(
        () =>
          new EinvoiceEnterpriseApiError(
            'GSTZen API token is not configured. Set `environment` + `EINVOICE_GSTZEN_HTTP_CONFIG`.',
          ),
      );
    }
    const url = resolveEinvoiceCancelEwbUrl(this.cfg);
    const headers = new HttpHeaders({
      Token: token,
      'Content-Type': 'application/json',
    });
    return this.http.post<Record<string, unknown>>(url, body, { headers }).pipe(
      map((res) => {
        assertGstZenCancelJsonResponse(res);
        return res;
      }),
      catchError((err: unknown) => throwError(() => mapGstZenHttpError(err))),
    );
  }

  updateVehicle(_body: Record<string, unknown>): Observable<Record<string, unknown>> {
    void _body;
    return this.notConfigured('Update vehicle');
  }

  extendValidity(_body: Record<string, unknown>): Observable<Record<string, unknown>> {
    void _body;
    return this.notConfigured('Extend validity');
  }

  cancelEwb(_body: Record<string, unknown>): Observable<Record<string, unknown>> {
    void _body;
    return this.notConfigured('Cancel EWB (standalone)');
  }

  private notConfigured(op: string): Observable<Record<string, unknown>> {
    return throwError(
      () =>
        new EinvoiceEnterpriseApiError(
          `${op} API URL not configured in enterprise einvoice module yet.`,
        ),
    );
  }
}
