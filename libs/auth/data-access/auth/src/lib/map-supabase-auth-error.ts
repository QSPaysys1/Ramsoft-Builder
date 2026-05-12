import type { AuthError } from '@supabase/supabase-js';

export function mapSupabaseAuthError(error: unknown): string {
  if (error instanceof Error) {
    const m = error.message.toLowerCase();
    const n = error.name || '';
    if (
      n === 'AuthRetryableFetchError' ||
      m.includes('failed to fetch') ||
      m.includes('load failed') ||
      m.includes('networkerror') ||
      m.includes('network request failed')
    ) {
      return (
        'Network error. Check your connection. If you are online, verify environment.supabase.url ' +
        '(https://<project-ref>.supabase.co) and anonKey in apps/ramsoft-web/src/environments/environment.ts — placeholder values cause this.'
      );
    }
    if (m.includes('only available in the browser')) {
      return 'Sign-in is only available in the browser.';
    }
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const msg = String((error as AuthError).message ?? '').toLowerCase();
    const code =
      'code' in error && typeof (error as AuthError).code === 'string'
        ? (error as AuthError).code
        : '';

    if (
      code === 'invalid_credentials' ||
      msg.includes('invalid login') ||
      msg.includes('invalid credentials') ||
      msg.includes('invalid email or password')
    ) {
      return (
        'Incorrect email, user name, or password. Check spelling and caps lock, or reset your password if available.'
      );
    }
    if (msg.includes('email not confirmed')) {
      return 'Please confirm your email before signing in.';
    }
    if (msg.includes('too many requests') || code === 'over_request_rate_limit') {
      return 'Too many attempts. Try again later.';
    }
    if (msg.includes('network') || msg.includes('fetch')) {
      return 'Network error. Check your connection and try again.';
    }
    if (
      msg.includes('invalid apikey') ||
      msg.includes('jwt') ||
      msg.includes('anonymous access disabled')
    ) {
      return 'Authentication is not configured correctly. Check Supabase URL and anon key in environment.';
    }
    const raw = String((error as AuthError).message ?? '').trim();
    if (raw) {
      return raw;
    }
  }
  return 'Sign in failed. Please try again.';
}
