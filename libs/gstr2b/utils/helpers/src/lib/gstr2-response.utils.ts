export function gstr2AsRecord(v: unknown): Record<string, unknown> | undefined {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : undefined;
}

/** Parse JSON embedded in a string field (GSTZen sometimes stringifies `message`). */
export function gstr2ParseJsonLike(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  const t = value.trim();
  if (!t || (!t.startsWith('{') && !t.startsWith('['))) {
    return value;
  }
  try {
    return JSON.parse(t) as unknown;
  } catch {
    return value;
  }
}

export function gstr2MessageRecord(
  root: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const parsed = gstr2ParseJsonLike(root['message'] ?? root['Message']);
  return gstr2AsRecord(parsed);
}

/**
 * Coerces GSTZen GSTR-2 envelopes: null/empty body, JSON strings, single-element arrays,
 * and `{ data: { ... } }` wrappers into a plain object for parsers and logical-error checks.
 */
export function gstr2CoercePayloadRoot(payload: unknown): Record<string, unknown> | undefined {
  let v: unknown = payload;
  if (v === null || v === undefined || v === '') {
    return { status: 1, message: {} };
  }
  if (typeof v === 'string') {
    const parsed = gstr2ParseJsonLike(v);
    if (parsed === v) {
      return undefined;
    }
    v = parsed;
  }
  if (Array.isArray(v)) {
    if (v.length === 0) {
      return { status: 1, message: {} };
    }
    if (v.length === 1) {
      return gstr2CoercePayloadRoot(v[0]);
    }
    return undefined;
  }
  let root = gstr2AsRecord(v);
  if (!root) {
    return undefined;
  }

  for (let depth = 0; depth < 3; depth++) {
    const data = gstr2AsRecord(root['data'] ?? root['Data']);
    if (!data) {
      break;
    }
    const msg = gstr2MessageRecord(data) ?? data;
    root = {
      ...root,
      ...data,
      status: root['status'] ?? data['status'] ?? 1,
      message: gstr2AsRecord(root['message']) ?? msg,
    };
  }

  const parsedMsg = gstr2MessageRecord(root);
  if (parsedMsg && !gstr2AsRecord(root['message'])) {
    root = { ...root, message: parsedMsg };
  }

  return root;
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
  const s = r['status'] ?? r['status_cd'] ?? r['statusCd'];
  if (s === true) {
    return true;
  }
  if (typeof s === 'string' && s.toLowerCase() === 'success') {
    return true;
  }
  return s === 1 || s === '1' || s === 200 || s === '200';
}

export function gstr2LogicalError(
  payload: unknown,
  apiLabel: string,
): string | null {
  const root = gstr2CoercePayloadRoot(payload);
  if (!root) {
    if (typeof payload === 'string' && payload.trim()) {
      return payload.trim();
    }
    return `Unexpected response from ${apiLabel}.`;
  }

  if (gstr2StatusIndicatesSuccess(root)) {
    return null;
  }

  const err =
    root['error'] ??
    root['Error'] ??
    root['detail'] ??
    (gstr2MessageRecord(root)?.['error'] ?? gstr2MessageRecord(root)?.['Error']);
  if (typeof err === 'string' && err.trim()) {
    return err.trim();
  }

  const msgRaw = root['message'] ?? root['Message'];
  if (typeof msgRaw === 'string' && msgRaw.trim()) {
    return msgRaw.trim();
  }

  return `${apiLabel} request did not return a success status.`;
}
