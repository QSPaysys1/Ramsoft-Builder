/** Body for GSTZen GSTN Check Session (`POST /api/gstn-check-session/`). */
export interface GstnCheckSessionRequestBody {
  readonly gstin: string;
}

/**
 * Successful JSON envelope from GSTZen (see GSTZen API docs).
 * `status` 1 = GSTIN found; distinguish active/inactive portal session via `message`.
 * `status` 0 = GSTIN not linked to account (treated as invalid for this GSTZen user).
 */
export interface GstnCheckSessionSuccessResponse {
  readonly status: 0 | 1;
  readonly api_call?: string;
  readonly message?: string;
  readonly [key: string]: unknown;
}

/** UI outcome after interpreting a {@link GstnCheckSessionSuccessResponse}. */
export type GstnCheckSessionUiOutcome =
  | 'active_session'
  | 'session_expired'
  | 'invalid_gstin'
  /** `status === 1` but message didn't match known active/inactive wording. */
  | 'ambiguous';

export function isGstnCheckSessionSuccessResponse(
  val: unknown,
): val is GstnCheckSessionSuccessResponse {
  if (!val || typeof val !== 'object') {
    return false;
  }
  const status = (val as Record<string, unknown>)['status'];
  return status === 0 || status === 1;
}

/**
 * Maps GSTZen check-session payload to UI categories.
 * Inactive/expired wording is inferred from GSTZen docs (e.g. "session is inactive").
 */
export function deriveGstnCheckSessionUiOutcome(
  res: GstnCheckSessionSuccessResponse,
): GstnCheckSessionUiOutcome {
  if (res.status === 0) {
    return 'invalid_gstin';
  }
  const raw = typeof res.message === 'string' ? res.message.trim() : '';
  const m = raw.toLowerCase();

  // "inactive" contains "active" as a substring — check inactive/expired patterns first.
  if (
    m.includes('inactive') ||
    m.includes('not active') ||
    m.includes('expired') ||
    m.includes('no active session')
  ) {
    return 'session_expired';
  }
  if (m.includes('session is active') || /\bis active\b/.test(m)) {
    return 'active_session';
  }
  if (!raw) {
    return 'ambiguous';
  }
  return 'ambiguous';
}
