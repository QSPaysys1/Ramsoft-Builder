const PREFIX = 'ramsoft.gstr2a.cache.';

/** Session-scoped cache key for a section payload. */
export function gstr2aSectionCacheKey(
  section: string,
  gstin: string,
  retPeriod: string,
): string {
  return `${PREFIX}${section}.${gstin.trim().toUpperCase()}.${retPeriod.trim()}`;
}

export function readGstr2aSectionCache<T>(key: string): T | null {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeGstr2aSectionCache<T>(key: string, value: T): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota */
  }
}
