import { inject, Injectable } from '@angular/core';
import type { User } from '@supabase/supabase-js';
import { AuthSessionService } from './auth-session.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly session = inject(AuthSessionService);

  /**
   * Email/password sign-in. Short names resolve via `resolve_login_identifier`
   * when the RPC exists; otherwise `{userName}@phone.com` (legacy).
   *
   * Returns the Supabase user so the store can update before navigation (avoids a
   * race where `authGuard` runs before `onAuthStateChange` fires).
   */
  login(userName: string, password: string): Promise<User> {
    return this.session.signInWithPassword(userName.trim(), password).then((data) => {
      const user = data.user;
      if (!user) {
        throw new Error('Sign-in succeeded but no user was returned.');
      }
      return user;
    });
  }

  logout(): Promise<void> {
    return this.session.signOut();
  }
}
