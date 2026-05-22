const PREFIX = 'ramsoft.gstr1a.cache.';

export function gstr1aSectionCacheKey(
  section: string,
  gstin: string,
  retPeriod: string,
): string {
  return `${PREFIX}${section}.${gstin.trim().toUpperCase()}.${retPeriod.trim()}`;
}

export function gstr1aWorkspaceCacheKey(gstin: string, retPeriod: string): string {
  return gstr1aSectionCacheKey('workspace', gstin, retPeriod);
}

export function readGstr1aSectionCache<T>(key: string): T | null {
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

export function writeGstr1aSectionCache<T>(key: string, value: T): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota */
  }
}
