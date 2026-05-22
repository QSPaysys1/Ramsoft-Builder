import { HttpErrorResponse } from '@angular/common/http';
import {
  gstzenUserFacingMessage,
  normalizeGstzenHttpError,
} from '@ramsoft-builder/gstr1/utils/http-error';

export function normalizeGstr2aHttpError(err: unknown): unknown {
  if (err instanceof HttpErrorResponse) {
    const bodyUnknown = err.error;
    let parsedBody = bodyUnknown;
    if (typeof bodyUnknown === 'string') {
      try {
        parsedBody = JSON.parse(bodyUnknown) as unknown;
      } catch {
        parsedBody = bodyUnknown;
      }
    }
    return {
      httpStatus: err.status,
      statusText: err.statusText,
      url: err.url ?? null,
      body: parsedBody,
    };
  }
  return normalizeGstzenHttpError(err);
}

export function gstr2aUserFacingMessage(
  httpError: unknown,
  logicalError: string | null,
): string {
  if (logicalError?.trim()) {
    return logicalError.trim();
  }
  return gstzenUserFacingMessage(httpError) ?? 'Something went wrong.';
}
