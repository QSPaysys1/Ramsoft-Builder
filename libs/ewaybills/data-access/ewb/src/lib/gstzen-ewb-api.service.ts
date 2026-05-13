import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  isEwbCancelSuccess,
  isEwbChangeMultiVehiclesSuccess,
  isEwbExtendSuccess,
  isEwbGenerateSuccess,
  isEwbMvGroupPostSuccess,
  isEwbUpdatePartBSuccess,
  isEwbUpdateTransporterSuccess,
  type EwbChangeMultiVehiclesRequest,
  type EwbChangeMultiVehiclesSuccess,
  type EwbMvGroupPostRequest,
  type EwbMvGroupPostSuccess,
  type EwbCancelReasonCode,
  type EwbCancelRequest,
  type EwbCancelSuccess,
  type EwbExtendRequest,
  type EwbExtendSuccess,
  type EwbGenerateRequest,
  type EwbGenerateSuccess,
  type EwbGetRequest,
  type EwbTransporterViewQuery,
  type EwbTransporterViewResult,
  type EwbUpdatePartBRequest,
  type EwbUpdatePartBSuccess,
  type EwbUpdateTransporterRequest,
  type EwbUpdateTransporterSuccess,
} from '@ramsoft-builder/ewaybills/models/ewb';
import {
  gstinValidator,
  normalizeEwbNoTo12Digits,
  normalizeEwbTransModeForApi,
  parseEwbCancelResponse,
  parseEwbExtendResponse,
  parseEwbGenerateResponse,
  parseEwbChangeMultiVehiclesResponse,
  parseEwbMvGroupPostResponse,
  parseEwbUpdatePartBResponse,
  parseEwbUpdateTransporterResponse,
  parseEwbTransporterViewResponse,
  ewbTransporterViewQueryDateValid,
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
  resolveEwbMultiVehicleUrl,
  resolveEwbMvGroupPostUrl,
  resolveEwbChangeMultiVehiclesUrl,
  resolveEwbGetTransporterViewUrl,
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
   * List e-way bills for a transporter GSTIN on a given date (GSTZen GET `ewbapi/get-ewb-transporter-view/`).
   *
   * @param query Query params `date` (`YYYY-MM-DD`) and `gstin` (transporter).
   * @param fromGstin Optional GSTIN for the `gstin` header when the app toggle is on (defaults to `query.gstin`).
   * @see https://my.gstzen.in/docs/api/ewaybill-api/get-ewb-transporter-view/
   */
  getEwbTransporterView(
    query: EwbTransporterViewQuery,
    fromGstin?: string,
  ): Observable<EwbTransporterViewResult> {
    const token = this.resolveEwbToken();
    if (!token) {
      return throwError(
        () =>
          new EwbGstZenApiError(
            'GSTZen API token is not configured. Set `environment.gstZen.token` (and optional `ewbTestToken` for the EWB test toggle) plus `GSTZEN_EWB_HTTP_CONFIG`.',
          ),
      );
    }
    const date = String(query.date ?? '').trim();
    const gstin = String(query.gstin ?? '').trim().toUpperCase();
    if (!ewbTransporterViewQueryDateValid(date)) {
      return throwError(
        () =>
          new EwbGstZenApiError(
            'Invalid date: use YYYY-MM-DD (e.g. 2024-01-02) for the transporter view API.',
          ),
      );
    }
    if (!gstinValidator(gstin)) {
      return throwError(
        () =>
          new EwbGstZenApiError('Invalid GSTIN: transporter view requires a 15-character GSTIN.'),
      );
    }
    const url = resolveEwbGetTransporterViewUrl(this.cfg);
    let headers = new HttpHeaders({ Token: token });
    const headerGstinRaw = (fromGstin ?? gstin).trim().toUpperCase();
    if (
      this.headerPrefs.includeGstinHeader() &&
      gstinValidator(headerGstinRaw)
    ) {
      headers = headers.set('gstin', headerGstinRaw);
    }
    const params = new HttpParams().set('date', date).set('gstin', gstin);
    return this.http.get<unknown>(url, { headers, params }).pipe(
      map((res) => parseEwbTransporterViewResponse(res)),
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
    return this.postEwbExtendEndpoint(resolveEwbExtendUrl(this.cfg), body, fromGstin);
  }

  /**
   * Initiate multi-vehicle movement — NIC uses the same JSON body and (by default) the same
   * `ewbapi/extend/` URL as “extend”; override `multiVehicleUrl` only if GSTZen maps a different path.
   */
  initiateMultiVehicleMovement(
    body: EwbExtendRequest,
    fromGstin?: string,
  ): Observable<EwbExtendSuccess> {
    return this.postEwbExtendEndpoint(resolveEwbMultiVehicleUrl(this.cfg), body, fromGstin);
  }

  /**
   * Add vehicles to a multi-vehicle group via GSTZen `ewbapi/add-multi-vehicles/`.
   */
  postMvGroup(
    body: EwbMvGroupPostRequest,
    fromGstin?: string,
  ): Observable<EwbMvGroupPostSuccess> {
    const token = this.resolveEwbToken();
    if (!token) {
      return throwError(
        () =>
          new EwbGstZenApiError(
            'GSTZen API token is not configured. Set `environment.gstZen.token` (and optional `ewbTestToken` for the EWB test toggle) plus `GSTZEN_EWB_HTTP_CONFIG`.',
          ),
      );
    }
    const url = resolveEwbMvGroupPostUrl(this.cfg);
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
    const payload: EwbMvGroupPostRequest = {
      ewbNo: ewbNoNorm,
      groupNo: String(body.groupNo ?? '').trim(),
      vehicleNo: String(body.vehicleNo ?? '')
        .trim()
        .toUpperCase()
        .replace(/\s+/g, ''),
      transDocNo: String(body.transDocNo ?? '').trim(),
      transDocDate: String(body.transDocDate ?? '').trim(),
      quantity: Math.trunc(Number(body.quantity)),
    };
    return this.http.post<Record<string, unknown>>(url, payload, { headers }).pipe(
      map((res) => {
        const parsed = parseEwbMvGroupPostResponse(res);
        if (!isEwbMvGroupPostSuccess(parsed)) {
          const msg =
            typeof parsed.message === 'string' && parsed.message.trim()
              ? parsed.message.trim()
              : 'Add multi-vehicles request did not succeed (unrecognized GSTZen response).';
          throw new EwbGstZenApiError(msg, 200, res);
        }
        return parsed;
      }),
      catchError((err: unknown) => throwError(() => mapEwbGstZenHttpError(err))),
    );
  }

  /**
   * Change vehicle / transport within a multi-vehicle group (`ewbapi/change-multi-vehicles/`).
   * Payload keys (`oldvehicleNo`, etc.) follow NIC / GSTZen JSON samples.
   */
  changeMultiVehicles(
    body: EwbChangeMultiVehiclesRequest,
    fromGstin?: string,
  ): Observable<EwbChangeMultiVehiclesSuccess> {
    const token = this.resolveEwbToken();
    if (!token) {
      return throwError(
        () =>
          new EwbGstZenApiError(
            'GSTZen API token is not configured. Set `environment.gstZen.token` (and optional `ewbTestToken` for the EWB test toggle) plus `GSTZEN_EWB_HTTP_CONFIG`.',
          ),
      );
    }
    const url = resolveEwbChangeMultiVehiclesUrl(this.cfg);
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
    const groupNorm = Math.trunc(Number(body.groupNo));
    const payload: EwbChangeMultiVehiclesRequest = {
      ewbNo: ewbNoNorm,
      groupNo: groupNorm,
      oldvehicleNo: String(body.oldvehicleNo ?? '')
        .trim()
        .toUpperCase()
        .replace(/\s+/g, ''),
      newVehicleNo: String(body.newVehicleNo ?? '')
        .trim()
        .toUpperCase()
        .replace(/\s+/g, ''),
      oldTranNo: String(body.oldTranNo ?? '').trim(),
      newTranNo: String(body.newTranNo ?? '').trim(),
      fromPlace: String(body.fromPlace ?? '').trim(),
      fromState: Math.trunc(Number(body.fromState)),
      reasonCode: String(body.reasonCode ?? '').trim(),
      reasonRem: String(body.reasonRem ?? '').trim(),
    };
    return this.http.post<Record<string, unknown>>(url, payload, { headers }).pipe(
      map((res) => {
        const parsed = parseEwbChangeMultiVehiclesResponse(res);
        if (!isEwbChangeMultiVehiclesSuccess(parsed)) {
          const msg =
            typeof parsed.message === 'string' && parsed.message.trim()
              ? parsed.message.trim()
              : 'Change multi vehicles request did not succeed (unrecognized GSTZen response).';
          throw new EwbGstZenApiError(msg, 200, res);
        }
        return parsed;
      }),
      catchError((err: unknown) => throwError(() => mapEwbGstZenHttpError(err))),
    );
  }

  private postEwbExtendEndpoint(
    url: string,
    body: EwbExtendRequest,
    fromGstin?: string,
  ): Observable<EwbExtendSuccess> {
    const token = this.resolveEwbToken();
    if (!token) {
      return throwError(
        () =>
          new EwbGstZenApiError(
            'GSTZen API token is not configured. Set `environment.gstZen.token` (and optional `ewbTestToken` for the EWB test toggle) plus `GSTZEN_EWB_HTTP_CONFIG`.',
          ),
      );
    }
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
    const consignment = String(body.consignmentStatus ?? '')
      .trim()
      .toUpperCase();
    const payload: EwbExtendRequest = {
      ...body,
      ewbNo: ewbNoNorm,
      vehicleNo: String(body.vehicleNo ?? '')
        .trim()
        .toUpperCase()
        .replace(/\s+/g, ''),
      fromPlace: String(body.fromPlace ?? '').trim(),
      fromState: Math.trunc(Number(body.fromState)),
      fromPincode: Math.trunc(Number(body.fromPincode)),
      remainingDistance: Math.max(0, Math.round(Number(body.remainingDistance))),
      transDocNo: String(body.transDocNo ?? '').trim(),
      transMode: normalizeEwbTransModeForApi(String(body.transMode)),
      extnRsnCode: Math.trunc(Number(body.extnRsnCode)),
      extnRemarks: String(body.extnRemarks ?? '').trim(),
      transitType: body.transitType != null ? String(body.transitType).trim() : '',
      consignmentStatus: consignment === 'T' ? 'T' : 'M',
    };
    return this.http.post<Record<string, unknown>>(url, payload, { headers }).pipe(
      map((res) => {
        const parsed = parseEwbExtendResponse(res);
        if (!isEwbExtendSuccess(parsed)) {
          const msg =
            typeof parsed.message === 'string' && parsed.message.trim()
              ? parsed.message.trim()
              : 'The GSTZen e-way bill request did not succeed (unrecognized response).';
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
