const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Converts `yyyy-mm-dd` (HTML `type="date"`) to `DD/MM/YYYY` for GSTZen / NIC payloads.
 * Returns empty string if invalid.
 */
export function formatIsoDateToDdMmYyyy(iso: string): string {
  const t = iso.trim();
  const m = t.match(ISO_DATE);
  if (!m) {
    return '';
  }
  const y = m[1];
  const mo = m[2];
  const d = m[3];
  return `${d}/${mo}/${y}`;
}

/**
 * If `raw` is ISO `yyyy-mm-dd`, return DD/MM/YYYY; otherwise return trimmed `raw` (legacy manual entry).
 */
export function normalizeDocDateForApi(raw: unknown): string {
  const s = raw == null ? '' : String(raw).trim();
  if (!s) {
    return '';
  }
  if (ISO_DATE.test(s)) {
    return formatIsoDateToDdMmYyyy(s);
  }
  return s;
}
