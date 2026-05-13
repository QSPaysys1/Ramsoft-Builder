import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  isEwbCancelSuccess,
  isEwbExtendSuccess,
  isEwbGenerateSuccess,
  isEwbUpdatePartBSuccess,
  isEwbUpdateTransporterSuccess,
  type EwbCancelReasonCode,
  type EwbCancelRequest,
  type EwbCancelSuccess,
  type EwbExtendRequest,
  type EwbExtendSuccess,
  type EwbGenerateRequest,
  type EwbGenerateSuccess,
  type EwbGetRequest,
  type EwbUpdatePartBRequest,
  type EwbUpdatePartBSuccess,
  type EwbUpdateTransporterRequest,
  type EwbUpdateTransporterSuccess,
} from '@ramsoft-builder/ewaybills/models/ewb';
import {
  gstinValidator,
  normalizeEwbNoTo12Digits,
  parseEwbCancelResponse,
  parseEwbExtendResponse,
  parseEwbGenerateResponse,
  parseEwbUpdatePartBResponse,
  parseEwbUpdateTransporterResponse,
} from '@ramsoft-builder/ewaybills/utils/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { EwbGstZenApiError, mapEwbGstZenHttpError } from './gstzen-ewb-api.error';
import { GstZenEwbHeaderPrefsService } from './gstzen-ewb-header-prefs.service';
import { GstZenEwbTokenPrefsService } from './gstzen-ewb-token-prefs.service';
import {
  GSTZEN_EWB_HTTP_CONFIG,
  resolveEwbCancelUrl,
  resolveEwbGenerateUrl,
  resolveEwbGetUrl,
  resolveEwbUpdatePartBUrl,
  resolveEwbUpdateTransporterUrl,
  resolveEwbExtendUrl,
} from './gstzen-ewb-http.config';

@Injectable({ providedIn: 'root' })
export class GstZenEwbApiService {
  private readonly http = inject(HttpClient);
  private readonly cfg = inject(GSTZEN_EWB_HTTP_CONFIG);
  private readonly headerPrefs = inject(GstZenEwbHeaderPrefsService);
  private readonly tokenPrefs = inject(GstZenEwbTokenPrefsService);

  generate(body: EwbGenerateRequest): Observable<EwbGenerateSuccess> {
    const token = this.resolveEwbToken();
    if (!token) {
      return throwError(
        () =>
          new EwbGstZenApiError(
            'GSTZen API token is not configured. Set `environment.gstZen.token` (and optional `ewbTestToken` for the EWB test toggle) plus `GSTZEN_EWB_HTTP_CONFIG`.',
          ),
      );
    }
    const url = resolveEwbGenerateUrl(this.cfg);
    let headers = new HttpHeaders({
      Token: token,
      'Content-Type': 'application/json',
    });
    if (
      this.headerPrefs.includeGstinHeader() &&
      gstinValidator(body.fromGstin)
    ) {
      headers = headers.set('gstin', String(body.fromGstin).trim().toUpperCase());
    }
    return this.http.post<Record<string, unknown>>(url, body, { headers }).pipe(
      map((res) => {
        const parsed = parseEwbGenerateResponse(res);
        if (!isEwbGenerateSuccess(parsed)) {
          throw new EwbGstZenApiError(parsed.message, 200, res);
        }
        return parsed;
      }),
      catchError((err: unknown) => throwError(() => mapEwbGstZenHttpError(err))),
    );
  }

  /**
   * Fetch an existing e-way bill by number via GSTZen `ewbapi/getewb/`.
   * @param body `{ ewbNo }` per GSTZen docs.
   * @param fromGstin Optional GSTIN for the `gstin` header when the app toggle is on.
   * @see https://my.gstzen.in/docs/api/ewaybill-api/get-eway-bill/
   */
  getEwayBill(
    body: EwbGetRequest,
    fromGstin?: string,
  ): Observable<Record<string, unknown>> {
    const token = this.resolveEwbToken();
    if (!token) {
      return throwError(
        () =>
          new EwbGstZenApiError(
            'GSTZen API token is not configured. Set `environment.gstZen.token` (and optional `ewbTestToken` for the EWB test toggle) plus `GSTZEN_EWB_HTTP_CONFIG`.',
          ),
      );
    }
    const url = resolveEwbGetUrl(this.cfg);
    let headers = new HttpHeaders({
      Token: token,
      'Content-Type': 'application/json',
    });
    if (
      this.headerPrefs.includeGstinHeader() &&
      fromGstin &&
      gstinValidator(fromGstin)
    ) {
      headers = headers.set('gstin', String(fromGstin).trim().toUpperCase());
    }
    const payload: Record<string, unknown> = {
      ewbNo:
        typeof body.ewbNo === 'string'
          ? Number(String(body.ewbNo).replace(/\s+/g, ''))
          : body.ewbNo,
    };
    return this.http.post<Record<string, unknown>>(url, payload, { headers }).pipe(
      catchError((err: unknown) => throwError(() => mapEwbGstZenHttpError(err))),
    );
  }

  /**
   * Cancel an existing e-way bill via GSTZen `ewbapi/cancel/`.
   * @param body NIC fields `ewbNo`, `cancelRsnCode`, optional `cancelRmrk`.
   * @param fromGstin Optional seller GSTIN to forward as the `gstin` header when the toggle is on.
   */
  cancel(
    body: EwbCancelRequest,
    fromGstin?: string,
  ): Observable<EwbCancelSuccess> {
    const token = this.resolveEwbToken();
    if (!token) {
      return throwError(
        () =>
          new EwbGstZenApiError(
            'GSTZen API token is not configured. Set `environment.gstZen.token` (and optional `ewbTestToken` for the EWB test toggle) plus `GSTZEN_EWB_HTTP_CONFIG`.',
          ),
      );
    }
    const url = resolveEwbCancelUrl(this.cfg);
    let headers = new HttpHeaders({
      Token: token,
      'Content-Type': 'application/json',
    });
    if (
      this.headerPrefs.includeGstinHeader() &&
      fromGstin &&
      gstinValidator(fromGstin)
    ) {
      headers = headers.set('gstin', String(fromGstin).trim().toUpperCase());
    }
    const payload: EwbCancelRequest = {
      ewbNo:
        typeof body.ewbNo === 'string'
          ? Number(String(body.ewbNo).replace(/\s+/g, ''))
          : body.ewbNo,
      cancelRsnCode: Number(body.cancelRsnCode) as EwbCancelReasonCode,
      cancelRmrk: body.cancelRmrk?.trim() || undefined,
    };
    return this.http.post<Record<string, unknown>>(url, payload, { headers }).pipe(
      map((res) => {
        const parsed = parseEwbCancelResponse(res);
        if (!isEwbCancelSuccess(parsed)) {
          const msg =
            typeof parsed.message === 'string' && parsed.message.trim()
              ? parsed.message.trim()
              : 'E-way bill could not be cancelled (unrecognized GSTZen response).';
          throw new EwbGstZenApiError(msg, 200, res);
        }
        return parsed;
      }),
      catchError((err: unknown) => throwError(() => mapEwbGstZenHttpError(err))),
    );
  }

  /**
   * Update vehicle / Part B via GSTZen `ewbapi/updatepartb/` (URL configurable).
   *
   * @see https://my.gstzen.in/docs/api/ewaybill-api/update-partb/
   * @param body JSON body per GSTZen update Part B documentation.
   * @param fromGstin Optional GSTIN for the `gstin` header when the app toggle is on.
   */
  updatePartB(
    body: EwbUpdatePartBRequest,
    fromGstin?: string,
  ): Observable<EwbUpdatePartBSuccess> {
    const token = this.resolveEwbToken();
    if (!token) {
      return throwError(
        () =>
          new EwbGstZenApiError(
            'GSTZen API token is not configured. Set `environment.gstZen.token` (and optional `ewbTestToken` for the EWB test toggle) plus `GSTZEN_EWB_HTTP_CONFIG`.',
          ),
      );
    }
    const url = resolveEwbUpdatePartBUrl(this.cfg);
    let headers = new HttpHeaders({
      Token: token,
      'Content-Type': 'application/json',
    });
    if (
      this.headerPrefs.includeGstinHeader() &&
      fromGstin &&
      gstinValidator(fromGstin)
    ) {
      headers = headers.set('gstin', String(fromGstin).trim().toUpperCase());
    }
    const ewbNoNorm =
      typeof body.ewbNo === 'string'
        ? Number(String(body.ewbNo).replace(/\s+/g, ''))
        : body.ewbNo;
    const payload: EwbUpdatePartBRequest = {
      ...body,
      ewbNo: ewbNoNorm,
    };
    return this.http.post<Record<string, unknown>>(url, payload, { headers }).pipe(
      map((res) => {
        const parsed = parseEwbUpdatePartBResponse(res);
        if (!isEwbUpdatePartBSuccess(parsed)) {
          const msg =
            typeof parsed.message === 'string' && parsed.message.trim()
              ? parsed.message.trim()
              : 'E-way bill Part B could not be updated (unrecognized GSTZen response).';
          throw new EwbGstZenApiError(msg, 200, res);
        }
        return parsed;
      }),
      catchError((err: unknown) => throwError(() => mapEwbGstZenHttpError(err))),
    );
  }

  /**
   * Update transporter via GSTZen `ewbapi/update-transporter/`.
   *
   * @see https://my.gstzen.in/docs/api/ewaybill-api/update-transporter/
   */
  updateTransporter(
    body: EwbUpdateTransporterRequest,
    fromGstin?: string,
  ): Observable<EwbUpdateTransporterSuccess> {
    const token = this.resolveEwbToken();
    if (!token) {
      return throwError(
        () =>
          new EwbGstZenApiError(
            'GSTZen API token is not configured. Set `environment.gstZen.token` (and optional `ewbTestToken` for the EWB test toggle) plus `GSTZEN_EWB_HTTP_CONFIG`.',
          ),
      );
    }
    const ewbNoNorm = normalizeEwbNoTo12Digits(body.ewbNo);
    const transNorm = String(body.transporterId ?? '').trim().toUpperCase();
    if (!ewbNoNorm || !gstinValidator(transNorm)) {
      return throwError(
        () =>
          new EwbGstZenApiError(
            'Invalid request: ewbNo must be 12 digits and transporterId a valid 15-character GSTIN.',
          ),
      );
    }
    const url = resolveEwbUpdateTransporterUrl(this.cfg);
    let headers = new HttpHeaders({
      Token: token,
      'Content-Type': 'application/json',
    });
    if (
      this.headerPrefs.includeGstinHeader() &&
      fromGstin &&
      gstinValidator(fromGstin)
    ) {
      headers = headers.set('gstin', String(fromGstin).trim().toUpperCase());
    }
    const payload: EwbUpdateTransporterRequest = {
      ewbNo: ewbNoNorm,
      transporterId: transNorm,
    };
    return this.http.post<Record<string, unknown>>(url, payload, { headers }).pipe(
      map((res) => {
        const parsed = parseEwbUpdateTransporterResponse(res);
        if (!isEwbUpdateTransporterSuccess(parsed)) {
          const msg =
            typeof parsed.message === 'string' && parsed.message.trim()
              ? parsed.message.trim()
              : 'E-way bill transporter could not be updated (unrecognized GSTZen response).';
          throw new EwbGstZenApiError(msg, 200, res);
        }
        return parsed;
      }),
      catchError((err: unknown) => throwError(() => mapEwbGstZenHttpError(err))),
    );
  }

  /**
   * Extend e-way bill validity via GSTZen `ewbapi/extend/`.
   *
   * @see https://my.gstzen.in/docs/api/ewaybill-api/extend-eway-bill/
   */
  extend(body: EwbExtendRequest, fromGstin?: string): Observable<EwbExtendSuccess> {
    const token = this.resolveEwbToken();
    if (!token) {
      return throwError(
        () =>
          new EwbGstZenApiError(
            'GSTZen API token is not configured. Set `environment.gstZen.token` (and optional `ewbTestToken` for the EWB test toggle) plus `GSTZEN_EWB_HTTP_CONFIG`.',
          ),
      );
    }
    const url = resolveEwbExtendUrl(this.cfg);
    let headers = new HttpHeaders({
      Token: token,
      'Content-Type': 'application/json',
    });
    if (
      this.headerPrefs.includeGstinHeader() &&
      fromGstin &&
      gstinValidator(fromGstin)
    ) {
      headers = headers.set('gstin', String(fromGstin).trim().toUpperCase());
    }
    const ewbNoNorm = Number(String(body.ewbNo).replace(/\s+/g, ''));
    const payload: EwbExtendRequest = {
      ...body,
      ewbNo: ewbNoNorm,
      fromState: Math.trunc(Number(body.fromState)),
      fromPincode: Math.trunc(Number(body.fromPincode)),
      remainingDistance: Math.max(0, Math.round(Number(body.remainingDistance))),
      extnRsnCode: Math.trunc(Number(body.extnRsnCode)),
    };
    return this.http.post<Record<string, unknown>>(url, payload, { headers }).pipe(
      map((res) => {
        const parsed = parseEwbExtendResponse(res);
        if (!isEwbExtendSuccess(parsed)) {
          const msg =
            typeof parsed.message === 'string' && parsed.message.trim()
              ? parsed.message.trim()
              : 'E-way bill could not be extended (unrecognized GSTZen response).';
          throw new EwbGstZenApiError(msg, 200, res);
        }
        return parsed;
      }),
      catchError((err: unknown) => throwError(() => mapEwbGstZenHttpError(err))),
    );
  }

  /** Primary token, or `ewbTestToken` when the topbar EWB test toggle is on. */
  private resolveEwbToken(): string | null {
    const primary = this.cfg.token?.trim() ?? '';
    const test = this.cfg.ewbTestToken?.trim() ?? '';
    if (this.tokenPrefs.useEwbTestToken() && test) {
      return test;
    }
    return primary || null;
  }
}
