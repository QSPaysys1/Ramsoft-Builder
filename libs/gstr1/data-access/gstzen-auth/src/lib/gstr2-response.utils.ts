export function gstr2AsRecord(v: unknown): Record<string, unknown> | undefined {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : undefined;
}

export function gstr2Str(v: unknown): string {
  if (v === null || v === undefined) {
    return '';
  }
  if (typeof v === 'string') {
    return v.trim();
  }
  if (typeof v === 'number' || typeof v === 'boolean') {
    return String(v);
  }
  return '';
}

export function gstr2PickField(
  row: Record<string, unknown>,
  keys: readonly string[],
): string {
  for (const k of keys) {
    const s = gstr2Str(row[k]);
    if (s) {
      return s;
    }
  }
  return '';
}

export function gstr2StatusIndicatesSuccess(raw: unknown): boolean {
  const r = gstr2AsRecord(raw);
  if (!r) {
    return false;
  }
  const s = r['status'];
  return s === 1 || s === '1' || s === 200 || s === '200';
}

export function gstr2LogicalError(
  payload: unknown,
  apiLabel: string,
): string | null {
  if (
    gstr2StatusIndicatesSuccess(payload) &&
    typeof gstr2AsRecord(payload)?.['message'] === 'object' &&
    gstr2AsRecord(payload)?.['message'] !== null
  ) {
    return null;
  }
  const r = gstr2AsRecord(payload);
  if (!r) {
    return `Unexpected response from ${apiLabel}.`;
  }
  const err =
    r['error'] ??
    r['Error'] ??
    r['detail'] ??
    (gstr2AsRecord(r['message'])?.['error'] ?? gstr2AsRecord(r['message'])?.['Error']);
  if (typeof err === 'string' && err.trim()) {
    return err.trim();
  }
  if (!gstr2StatusIndicatesSuccess(payload)) {
    return `${apiLabel} request did not return a success status.`;
  }
  return null;
}
