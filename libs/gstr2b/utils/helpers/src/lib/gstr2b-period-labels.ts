const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export function monthNameFromMmYyyy(mmYyyy: string): string {
  const t = mmYyyy.trim();
  if (t.length !== 6) {
    return t;
  }
  const mm = Number.parseInt(t.slice(0, 2), 10);
  const yyyy = t.slice(2);
  if (mm < 1 || mm > 12) {
    return t;
  }
  return `${MONTHS[mm - 1]} ${yyyy}`;
}

export function indianFyLabelFromMmYyyy(mmYyyy: string): string {
  const t = mmYyyy.trim();
  if (t.length !== 6) {
    return t;
  }
  const mm = Number.parseInt(t.slice(0, 2), 10);
  const yyyy = Number.parseInt(t.slice(2), 10);
  if (!Number.isFinite(yyyy) || mm < 1 || mm > 12) {
    return t;
  }
  const start = mm >= 4 ? yyyy : yyyy - 1;
  const end = (start + 1) % 100;
  const endFull = start + 1;
  return `FY ${start}-${String(endFull).slice(-2)}`;
}

export function pickProfileString(
  obj: Record<string, unknown> | undefined,
  keys: readonly string[],
): string {
  if (!obj) {
    return '';
  }
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim()) {
      return v.trim();
    }
  }
  return '';
}
