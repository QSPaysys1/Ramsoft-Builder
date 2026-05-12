import {
  DestroyRef,
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { Session, User } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '@ramsoft-builder/shared/data-access/supabase';
import { AuthService } from './auth.service';
import { mapSupabaseAuthError } from './map-supabase-auth-error';
import { logSignInFailure } from './log-sign-in-failure';

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'error';

/** Minimal user shape for UI (replaces `firebase/auth` User). */
export interface AppUser {
  id: string;
  email: string | null;
  displayName: string | null;
  photoUrl: string | null;
}

function mapSupabaseUser(user: User): AppUser {
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const dn = meta?.['full_name'] ?? meta?.['name'];
  const avatar = meta?.['avatar_url'];
  return {
    id: user.id,
    email: user.email ?? null,
    displayName: typeof dn === 'string' ? dn : null,
    photoUrl: typeof avatar === 'string' ? avatar : null,
  };
}

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly client = inject(SUPABASE_CLIENT);
  private readonly authService = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  readonly user = signal<AppUser | null>(null);
  readonly status = signal<AuthStatus>('idle');
  readonly errorMessage = signal<string | null>(null);
  /** True after the first auth state emission (browser only). */
  readonly authResolved = signal(false);

  constructor() {
    if (isPlatformBrowser(this.platformId) && this.client) {
      const client = this.client;

      const sync = (event: string, session: Session | null) => {
        const u = session?.user;
        console.debug('[auth] session sync', {
          event,
          hasSession: !!session,
          userId: u?.id,
          tokenExpiry: session?.expires_at,
        });
        this.user.set(u ? mapSupabaseUser(u) : null);
        this.authResolved.set(true);
        if (u) {
          this.status.set('authenticated');
          this.errorMessage.set(null);
        } else if (this.status() === 'authenticated') {
          this.status.set('idle');
        }
      };

      void client.auth.getSession().then(({ data: { session } }) => {
        console.debug('[auth] getSession (diagnostic)', {
          hasSession: !!session,
          userId: session?.user?.id,
        });
      });

      const { data } = client.auth.onAuthStateChange((event, session) => {
        sync(event, session);
      });
      this.destroyRef.onDestroy(() => {
        data.subscription.unsubscribe();
      });
    } else {
      if (isPlatformBrowser(this.platformId) && !this.client) {
        console.warn(
          '[auth] AuthStore: no Supabase client in browser — check environment.supabase url and anonKey.',
        );
      }
      this.authResolved.set(true);
    }
  }

  async loginWithUserNamePassword(
    userName: string,
    password: string,
  ): Promise<void> {
    this.errorMessage.set(null);
    this.status.set('loading');
    console.log('[auth] login attempt', { userName: userName.trim() });
    try {
      const supabaseUser = await this.authService.login(userName, password);
      console.log('[auth] login Supabase user / role-related metadata', {
        userId: supabaseUser.id,
        email: supabaseUser.email,
        appMetadata: supabaseUser.app_metadata,
        userMetadata: supabaseUser.user_metadata,
      });
      this.user.set(mapSupabaseUser(supabaseUser));
      this.status.set('authenticated');
      console.log('[auth] store updated — authenticated', {
        userId: this.user()?.id,
        email: this.user()?.email,
      });
    } catch (err) {
      logSignInFailure(userName, err);
      this.status.set('error');
      this.errorMessage.set(mapSupabaseAuthError(err));
      throw err;
    }
  }

  async logout(): Promise<void> {
    await this.authService.logout();
    this.user.set(null);
    this.status.set('idle');
    this.errorMessage.set(null);
  }

  clearError(): void {
    this.errorMessage.set(null);
    if (this.status() === 'error') {
      this.status.set('idle');
    }
  }
}
