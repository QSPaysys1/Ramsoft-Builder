/**
 * Prevents open redirects. Only allows same-origin paths (leading `/`, not `//`).
 */
export function safeInternalNavigateUrl(
  raw: string | null | undefined,
  fallback: string,
): string {
  if (raw == null || raw === '') {
    return fallback;
  }
  let s = raw.trim();
  try {
    s = decodeURIComponent(s);
  } catch {
    return fallback;
  }
  if (!s.startsWith('/') || s.startsWith('//')) {
    return fallback;
  }
  if (/^[a-zA-Z][a-zA-Z+.-]*:/.test(s)) {
    return fallback;
  }
  return s;
}
