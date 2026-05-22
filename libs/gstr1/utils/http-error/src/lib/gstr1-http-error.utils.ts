import { HttpErrorResponse } from '@angular/common/http';

/** Normalized HTTP/API error shape for GSTZen and portal JSON responses. */
export interface GstzenHttpErrorEnvelope {
  readonly httpStatus?: number;
  readonly statusText?: string;
  readonly url?: string | null;
  readonly body?: unknown;
  readonly message?: string;
}

/**
 * Maps Angular `HttpErrorResponse`, `Error`, or unknown values into a stable envelope
 * for UI display and logging. Used across GSTR-1 workspace pages instead of duplicating
 * per-component `normalizeErrorEnvelope` helpers.
 */
export function normalizeGstzenHttpError(err: unknown): GstzenHttpErrorEnvelope {
  if (err instanceof HttpErrorResponse) {
    const bodyUnknown = err.error;
    let parsedBody: unknown = bodyUnknown;
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
  if (err instanceof Error) {
    return { message: err.message };
  }
  return { message: String(err) };
}

/** Best-effort user-facing message from GSTZen error JSON (`detail`, `message`, etc.). */
export function gstzenUserFacingMessage(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const rec = raw as Record<string, unknown>;
  for (const key of ['detail', 'message', 'error', 'error_message'] as const) {
    const v = rec[key];
    if (typeof v === 'string' && v.trim()) {
      return v.trim();
    }
  }
  return null;
}
