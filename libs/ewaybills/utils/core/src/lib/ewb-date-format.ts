const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DD_MM_YYYY = /^(\d{2})\/(\d{2})\/(\d{4})$/;

/**
 * Converts stored / API transport doc date (`DD/MM/YYYY` or `yyyy-mm-dd`) to `yyyy-mm-dd`
 * for HTML `input[type="date"]`. Returns empty string if the value cannot be parsed.
 */
export function transDocDateToDateInputValue(raw: unknown): string {
  const s = raw == null ? '' : String(raw).trim();
  if (!s) {
    return '';
  }
  if (ISO_DATE.test(s)) {
    return s;
  }
  const m = s.match(DD_MM_YYYY);
  if (!m) {
    return '';
  }
  const d = m[1];
  const mo = m[2];
  const y = m[3];
  return `${y}-${mo}-${d}`;
}

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
