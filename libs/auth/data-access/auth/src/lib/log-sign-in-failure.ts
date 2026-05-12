import type { AuthError } from '@supabase/supabase-js';
import { normalizeLoginEmail } from './normalize-login-email';

function pickCodeMessage(err: unknown): { code: string; message: string } {
  if (err && typeof err === 'object') {
    const code =
      'code' in err && typeof (err as AuthError).code === 'string'
        ? String((err as AuthError).code)
        : '';
    const message =
      'message' in err && typeof (err as AuthError).message === 'string'
        ? String((err as AuthError).message)
        : '';
    return { code, message };
  }
  return { code: '', message: '' };
}

/**
 * Safe structured log for failed sign-in (never logs password).
 */
export function logSignInFailure(identifier: string, err: unknown): void {
  const trimmed = identifier.trim();
  const providerLoginEmail = normalizeLoginEmail(trimmed);
  const { code, message } = pickCodeMessage(err);
  // identifier = raw input; providerLoginEmail = value passed to Supabase (password never logged).
  console.warn('[auth] sign-in failed', {
    identifier: trimmed,
    providerLoginEmail:
      providerLoginEmail === trimmed ? undefined : providerLoginEmail,
    providerCode: code,
    providerMessage: message,
  });
  if (code === 'invalid_credentials') {
    console.info(
      '[auth] invalid_credentials: confirm auth.users.email and encrypted_password (see supabase/repair/). ' +
        'Short names use public.resolve_login_identifier → legacy_user_flat.login_email, else name@phone.com.',
    );
  }
  if (err instanceof Error) {
    console.error('[auth] sign-in error (Error)', {
      name: err.name,
      message: err.message,
      stack: err.stack,
    });
  } else {
    console.error('[auth] sign-in error (raw)', err);
  }
}
