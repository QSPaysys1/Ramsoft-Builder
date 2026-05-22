export function normalizeGstr2bHttpError(err: unknown): unknown {
  return err;
}

export function gstr2bUserFacingMessage(
  httpError: unknown,
  logicalError: string | null,
): string {
  if (logicalError?.trim()) {
    return logicalError.trim();
  }
  if (httpError && typeof httpError === 'object' && 'message' in httpError) {
    const m = (httpError as { message?: unknown }).message;
    if (typeof m === 'string' && m.trim()) {
      return m.trim();
    }
  }
  return 'Unable to load GSTR-2B data. Try again.';
}
