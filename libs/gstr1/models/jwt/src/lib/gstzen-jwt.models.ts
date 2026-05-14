/** Successful JWT pair returned by GSTZen `POST /accounts/api/login/token/`. */
export interface GstZenJwtTokenPair {
  readonly access: string;
  readonly refresh: string;
}

/** Typical validation error payload from GSTZen login. */
export interface GstZenJwtLoginError {
  readonly detail: string | string[];
}

export type GstZenJwtLoginResponse = GstZenJwtTokenPair | GstZenJwtLoginError;

export function isGstZenJwtTokenPair(
  value: unknown,
): value is GstZenJwtTokenPair {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const v = value as Record<string, unknown>;
  return typeof v['access'] === 'string' && typeof v['refresh'] === 'string';
}

export function isGstZenJwtLoginError(
  value: unknown,
): value is GstZenJwtLoginError {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const d = (value as Record<string, unknown>)['detail'];
  return typeof d === 'string' || Array.isArray(d);
}

export function formatGstZenJwtDetail(detail: unknown): string {
  if (typeof detail === 'string') {
    return detail;
  }
  if (Array.isArray(detail)) {
    return detail.map((d) => String(d)).join(' ');
  }
  return 'Unable to sign in.';
}
