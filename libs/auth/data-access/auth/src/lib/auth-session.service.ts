import { Injectable, inject } from '@angular/core';
import { SUPABASE_CLIENT } from '@ramsoft-builder/shared/data-access/supabase';
import type { AuthResponse } from '@supabase/supabase-js';
import { normalizeLoginEmail } from './normalize-login-email';

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly client = inject(SUPABASE_CLIENT);

  /**
   * Short names → `legacy_user_flat.login_email` via RPC when possible;
   * otherwise `{name}@phone.com`. Full emails are unchanged.
   */
  private async resolveSignInEmail(identifier: string): Promise<string> {
    const trimmed = identifier.trim();
    if (!trimmed) {
      return trimmed;
    }
    if (trimmed.includes('@')) {
      console.debug('[auth] sign-in identifier already an email');
      return trimmed;
    }
    const c = this.client;
    if (!c) {
      return normalizeLoginEmail(trimmed);
    }
    const { data, error } = await c.rpc('resolve_login_identifier', {
      p_identifier: trimmed,
    });
    if (error) {
      const missingFn =
        error.code === 'PGRST202' ||
        /could not find|schema cache|404/i.test(error.message ?? '');
      if (missingFn) {
        console.info(
          '[auth] resolve_login_identifier is not deployed (404 / PGRST202). Apply supabase/migrations/20250512130000_resolve_login_identifier.sql. Using legacy @phone.com fallback.',
        );
      } else {
        console.debug('[auth] resolve_login_identifier failed; using @phone.com fallback', {
          message: error.message,
          code: error.code,
        });
      }
      return normalizeLoginEmail(trimmed);
    }
    if (typeof data === 'string' && data.length > 0) {
      console.debug('[auth] resolve_login_identifier', {
        shortName: trimmed,
        signInEmail: data,
      });
      return data;
    }
    return normalizeLoginEmail(trimmed);
  }

  async signInWithPassword(
    identifier: string,
    password: string,
  ): Promise<AuthResponse['data']> {
    const c = this.client;
    if (!c) {
      console.error(
        '[auth] signInWithPassword: SUPABASE_CLIENT is null (SSR or missing env url/anonKey).',
      );
      throw new Error('Sign-in is only available in the browser.');
    }
    const email = await this.resolveSignInEmail(identifier);
    const supabaseUrl = (c as unknown as { supabaseUrl: string }).supabaseUrl;
    const host = (() => {
      try {
        return new URL(supabaseUrl).host;
      } catch {
        return '(invalid supabase url)';
      }
    })();
    console.log('[auth] signInWithPassword request', { signInEmail: email, supabaseHost: host });
    const { data, error } = await c.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      console.error('[auth] signInWithPassword Supabase error', {
        name: error.name,
        message: error.message,
        status: error.status,
        code: 'code' in error ? (error as { code?: string }).code : undefined,
      });
      throw error;
    }
    console.log('[auth] signInWithPassword success — session issued', {
      sessionExpiresAt: data.session?.expires_at,
      accessTokenLen: data.session?.access_token?.length,
      refreshTokenLen: data.session?.refresh_token?.length,
      userId: data.user?.id,
      userEmail: data.user?.email,
      appMetadata: data.user?.app_metadata,
      userMetadata: data.user?.user_metadata,
    });
    return data;
  }

  async signOut(): Promise<void> {
    const c = this.client;
    if (!c) {
      return;
    }
    const { error } = await c.auth.signOut();
    if (error) {
      throw error;
    }
  }
}
