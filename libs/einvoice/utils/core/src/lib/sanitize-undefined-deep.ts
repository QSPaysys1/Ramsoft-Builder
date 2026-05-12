/** JSON / Postgres payloads must not contain `undefined` (strip recursively). */
export function sanitizeUndefinedDeep(input: unknown): unknown {
  if (input === undefined) {
    return null;
  }
  if (input === null || typeof input !== 'object') {
    return input;
  }
  if (Array.isArray(input)) {
    return input.map((item) => sanitizeUndefinedDeep(item));
  }
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(input as Record<string, unknown>)) {
    if (val === undefined) {
      continue;
    }
    out[key] = sanitizeUndefinedDeep(val);
  }
  return out;
}
