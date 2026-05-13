import { HttpErrorResponse } from '@angular/common/http';

export class EwbGstZenApiError extends Error {
  constructor(
    message: string,
    readonly httpStatus?: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'EwbGstZenApiError';
  }
}

export function mapEwbGstZenHttpError(err: unknown): EwbGstZenApiError {
  if (err instanceof EwbGstZenApiError) {
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
    return new EwbGstZenApiError(message, err.status, err.error);
  }
  if (err instanceof Error) {
    return new EwbGstZenApiError(err.message);
  }
  return new EwbGstZenApiError('Unexpected error calling GSTZen e-way bill API.');
}
