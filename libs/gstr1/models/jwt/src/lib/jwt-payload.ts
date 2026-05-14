/**
 * Decode JWT payload (middle segment) without verifying the signature.
 * Used only for `exp` / client-side expiry hints.
 */
export function readJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    const segment = parts[1];
    if (!segment) {
      return null;
    }
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
    if (typeof atob !== 'function') {
      return null;
    }
    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Unix seconds from JWT `exp`, or null if missing/invalid. */
export function readJwtExpiryUnixSec(token: string): number | null {
  const payload = readJwtPayload(token);
  const exp = payload?.['exp'];
  if (typeof exp === 'number' && Number.isFinite(exp)) {
    return exp;
  }
  return null;
}
