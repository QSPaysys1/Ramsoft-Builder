import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { EinvoiceGenerateRequest, EinvoiceGenerateResponse } from '@ramsoft-builder/einvoice/models/nic';
import { catchError, map, Observable, throwError } from 'rxjs';
import {
  EinvoiceEnterpriseApiError,
  assertGstZenGenerateSuccess,
} from './einvoice-enterprise-api-error';
import { assertGstZenCancelJsonResponse, mapGstZenHttpError } from './gstzen-cancel-http';
import {
  EINVOICE_GSTZEN_HTTP_CONFIG,
  resolveEinvoiceCancelUrl,
  resolveEinvoiceGetByIrnUrl,
} from './gstzen-einvoice-http.config';
import { assertGstZenGetByIrnJsonResponse } from './gstzen-geteinv-http';

/** GSTZen `geteinv` request (see get-by-IRN API docs). */
export interface GetEinvoiceByIrnRequest {
  /** Seller GSTIN (15 characters). */
  gstin: string;
  /** 64-character IRN. */
  irn: string;
  /** Optional IRP (e.g. NIC1, NIC2); defaults to configured IRP when omitted. */
  irp?: string;
}

@Injectable({ providedIn: 'root' })
export class EinvoiceApiService {
  private readonly http = inject(HttpClient);
  private readonly cfg = inject(EINVOICE_GSTZEN_HTTP_CONFIG);

  generateIrn(body: EinvoiceGenerateRequest): Observable<EinvoiceGenerateResponse> {
    return this.postJson(this.cfg.einvoiceGenUrl, body);
  }

  cancelIrn(body: Record<string, unknown>): Observable<Record<string, unknown>> {
    const token = this.cfg.token?.trim();
    if (!token) {
      return throwError(
        () =>
          new EinvoiceEnterpriseApiError(
            'GSTZen API token is not configured. Set `environment` + `EINVOICE_GSTZEN_HTTP_CONFIG`.',
          ),
      );
    }
    const url = resolveEinvoiceCancelUrl(this.cfg);
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

  /**
   * GSTZen `geteinv` — requires `SellerDtls.Gstin` and `Irn`; optional `irp`.
   * @see https://my.gstzen.in/docs/api/einvoice-api/einvoice-get-by-irn/
   */
  getEinvoiceByIrn(req: GetEinvoiceByIrnRequest): Observable<Record<string, unknown>> {
    const token = this.cfg.token?.trim();
    if (!token) {
      return throwError(
        () =>
          new EinvoiceEnterpriseApiError(
            'GSTZen API token is not configured. Set `environment` + `EINVOICE_GSTZEN_HTTP_CONFIG`.',
          ),
      );
    }
    const gstin = req.gstin.trim().toUpperCase();
    const irn = req.irn.trim();
    if (!gstin) {
      return throwError(
        () => new EinvoiceEnterpriseApiError('Seller GSTIN is required.'),
      );
    }
    if (!irn) {
      return throwError(
        () => new EinvoiceEnterpriseApiError('IRN is required.'),
      );
    }
    const url = resolveEinvoiceGetByIrnUrl(this.cfg);
    const headers = new HttpHeaders({
      Token: token,
      'Content-Type': 'application/json',
    });
    const body: Record<string, unknown> = {
      SellerDtls: { Gstin: gstin },
      Irn: irn,
    };
    const irp = req.irp?.trim();
    if (irp) {
      body['irp'] = irp;
    }
    return this.http.post<Record<string, unknown>>(url, body, { headers }).pipe(
      map((res) => {
        assertGstZenGetByIrnJsonResponse(res);
        return res;
      }),
      catchError((err: unknown) => throwError(() => mapGstZenHttpError(err))),
    );
  }

  private postJson(
    url: string,
    body: EinvoiceGenerateRequest,
  ): Observable<EinvoiceGenerateResponse> {
    const token = this.cfg.token?.trim();
    if (!token) {
      return throwError(
        () =>
          new EinvoiceEnterpriseApiError(
            'GSTZen API token is not configured. Set `environment` + `EINVOICE_GSTZEN_HTTP_CONFIG`.',
          ),
      );
    }
    const headers = new HttpHeaders({
      Token: token,
      'Content-Type': 'application/json',
    });
    return this.http.post<EinvoiceGenerateResponse>(url, body, { headers }).pipe(
      map((res) => assertGstZenGenerateSuccess(res)),
      catchError((err: unknown) => throwError(() => mapGstZenHttpError(err))),
    );
  }

  /** Exposed for {@link EwaybillApiService} genewb POST. */
  postGenerateRaw(
    url: string,
    body: EinvoiceGenerateRequest,
  ): Observable<EinvoiceGenerateResponse> {
    return this.postJson(url, body);
  }
}
