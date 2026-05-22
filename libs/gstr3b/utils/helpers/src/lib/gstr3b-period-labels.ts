export function monthNameFromMmYyyy(mmYyyy: string): string {
  const t = mmYyyy.trim();
  if (t.length !== 6) {
    return t;
  }
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const mm = Number.parseInt(t.slice(0, 2), 10);
  const yyyy = t.slice(2);
  if (mm < 1 || mm > 12) {
    return t;
  }
  return `${months[mm - 1]} ${yyyy}`;
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
  return `FY ${start}-${String(start + 1).slice(-2)}`;
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
