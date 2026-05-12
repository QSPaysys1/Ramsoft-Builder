import { HttpErrorResponse } from '@angular/common/http';
import { EinvoiceEnterpriseApiError } from './einvoice-enterprise-api-error';

function looksLikeGstZenCancelOk(res: Record<string, unknown>): boolean {
  return Boolean(
    res['Irn'] ||
      res['CancelDate'] ||
      res['CancelDt'] ||
      res['Status'] === 'Cancelled' ||
      res['Status'] === 'CAN',
  );
}

/** Validates GSTZen IRN / IRN+EWB cancel JSON responses (HTTP 200 with error wrapper). */
export function assertGstZenCancelJsonResponse(res: Record<string, unknown>): void {
  if (looksLikeGstZenCancelOk(res)) {
    return;
  }
  const hasErr =
    res['Success'] === 'N' ||
    res['Success'] === false ||
    (Array.isArray(res['ErrorDetails']) && (res['ErrorDetails'] as unknown[]).length > 0);
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
  throw new EinvoiceEnterpriseApiError(msg, 200, res);
}

export function mapGstZenHttpError(err: unknown): EinvoiceEnterpriseApiError {
  if (err instanceof EinvoiceEnterpriseApiError) {
    return err;
  }
  if (err instanceof HttpErrorResponse) {
    const body = err.error as Record<string, unknown> | string | null;
    let message = err.message;
    if (body && typeof body === 'object') {
      const details = body['ErrorDetails'] as { ErrorMessage?: string }[] | undefined;
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
    return new EinvoiceEnterpriseApiError(message, err.status, err.error);
  }
  if (err instanceof Error) {
    return new EinvoiceEnterpriseApiError(err.message);
  }
  return new EinvoiceEnterpriseApiError('Unexpected error calling GSTZen API.');
}
