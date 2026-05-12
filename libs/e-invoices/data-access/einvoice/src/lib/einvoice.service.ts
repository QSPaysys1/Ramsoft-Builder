import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { EinvoiceApiError } from './einvoice-api-error';
import {
  GSTZEN_EINVOICE_CONFIG,
  resolveGstZenEinvoiceCancelUrl,
} from './gstzen-einvoice.config';
import type {
  EinvoiceGenerateRequest,
  EinvoiceGenerateResponse,
} from './models/einvoice-nic.models';

@Injectable({ providedIn: 'root' })
export class EinvoiceService {
  private readonly http = inject(HttpClient);
  private readonly gstZen = inject(GSTZEN_EINVOICE_CONFIG);

  generateEinvoice(
    body: EinvoiceGenerateRequest,
  ): Observable<EinvoiceGenerateResponse> {
    if (!this.gstZen.token?.trim()) {
      return throwError(
        () =>
          new EinvoiceApiError(
            'GSTZen API token is not configured. Set `environment.gstZen.token` or use a secure proxy.',
          ),
      );
    }

    const headers = new HttpHeaders({
      Token: this.gstZen.token,
      'Content-Type': 'application/json',
    });

    return this.http
      .post<EinvoiceGenerateResponse>(this.gstZen.einvoiceGenUrl, body, {
        headers,
      })
      .pipe(
        map((res) => this.assertGstZenBodySuccess(res)),
        catchError((err: unknown) => throwError(() => this.mapHttpError(err))),
      );
  }

  /**
   * NIC IRN cancel — POST to GSTZen `einvoice-json/cancel/` (same URL as usaccounting
   * `invoicefv.component.ts`). Body: original generate JSON (`baseObject`) plus `CnlRem`, `CnlRsn`.
   */
  cancelEinvoice(body: Record<string, unknown>): Observable<Record<string, unknown>> {
    const token = this.gstZen.token?.trim();
    if (!token) {
      return throwError(
        () =>
          new EinvoiceApiError(
            'GSTZen API token is not configured. Set `environment.gstZen.token` or use a secure proxy.',
          ),
      );
    }

    const cancelUrl = resolveGstZenEinvoiceCancelUrl(this.gstZen);

    const headers = new HttpHeaders({
      Token: token,
      'Content-Type': 'application/json',
    });

    return this.http
      .post<Record<string, unknown>>(cancelUrl, body, { headers })
      .pipe(
        map((res) => {
          this.assertCancelResponse(res);
          return res;
        }),
        catchError((err: unknown) => throwError(() => this.mapHttpError(err))),
      );
  }

  private assertGstZenBodySuccess(
    res: EinvoiceGenerateResponse,
  ): EinvoiceGenerateResponse {
    const raw = res as Record<string, unknown>;
    const irn =
      res.Irn?.trim() ||
      (typeof raw['irn'] === 'string' ? (raw['irn'] as string).trim() : '');
    if (irn) {
      return { ...res, Irn: irn };
    }

    const fromList =
      res.ErrorDetails?.map((e) => e.ErrorMessage)
        .filter(Boolean)
        .join('; ') ?? '';
    const msg =
      fromList ||
      res.ErrorMessage ||
      res.message ||
      'E-invoice generation failed (no IRN in response).';

    const failed =
      res.Success === 'N' ||
      res.Success === false ||
      Boolean(res.ErrorDetails?.length) ||
      Boolean(msg);

    if (failed) {
      throw new EinvoiceApiError(msg, 200, res);
    }

    return res;
  }

  private assertCancelResponse(res: Record<string, unknown>): void {
    if (this.looksLikeCancelOk(res)) {
      return;
    }
    const hasErr =
      res['Success'] === 'N' ||
      res['Success'] === false ||
      (Array.isArray(res['ErrorDetails']) &&
        (res['ErrorDetails'] as unknown[]).length > 0);
    if (!hasErr) {
      return;
    }
    const fromList =
      Array.isArray(res['ErrorDetails']) &&
      (res['ErrorDetails'] as { ErrorMessage?: string }[])
        .map((e) => e.ErrorMessage)
        .filter(Boolean)
        .join('; ');
    const msg =
      fromList ||
      (typeof res['message'] === 'string' ? res['message'] : '') ||
      (typeof res['ErrorMessage'] === 'string' ? res['ErrorMessage'] : '') ||
      'E-invoice cancellation failed.';
    throw new EinvoiceApiError(msg, 200, res);
  }

  /** Treat explicit IRN-cancel success fields as OK even when `Success` is absent. */
  private looksLikeCancelOk(res: Record<string, unknown>): boolean {
    return Boolean(
      res['Irn'] ||
        res['CancelDate'] ||
        res['CancelDt'] ||
        res['Status'] === 'Cancelled' ||
        res['Status'] === 'CAN',
    );
  }

  private mapHttpError(err: unknown): EinvoiceApiError {
    if (err instanceof EinvoiceApiError) {
      return err;
    }
    if (err instanceof HttpErrorResponse) {
      const body = err.error as Record<string, unknown> | string | null;
      let message = err.message;
      if (body && typeof body === 'object') {
        const details = body['ErrorDetails'] as
          | { ErrorMessage?: string }[]
          | undefined;
        const joined = details
          ?.map((d) => d.ErrorMessage)
          .filter(Boolean)
          .join('; ');
        message =
          joined ||
          (body['message'] as string) ||
          (body['ErrorMessage'] as string) ||
          message;
      } else if (typeof body === 'string' && body.trim()) {
        message = body;
      }
      return new EinvoiceApiError(message, err.status, err.error);
    }
    if (err instanceof Error) {
      return new EinvoiceApiError(err.message);
    }
    return new EinvoiceApiError('Unexpected error calling GSTZen API.');
  }
}
