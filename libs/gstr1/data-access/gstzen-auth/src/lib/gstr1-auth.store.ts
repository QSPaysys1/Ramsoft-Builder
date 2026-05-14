import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { readJwtExpiryUnixSec } from '@ramsoft-builder/gstr1/models/jwt';
import { Gstr1AuthError } from './gstr1-auth.errors';
import { Gstr1GstzenAuthService } from './gstr1-gstzen-auth.service';
import { Gstr1TokenStorageService } from './gstr1-token-storage.service';
import { GSTR1_GSTZEN_AUTH_CONFIG } from './gstr1-gstzen-auth.config';

export type Gstr1AuthStatus = 'idle' | 'loading' | 'authenticated' | 'error';

@Injectable({ providedIn: 'root' })
export class Gstr1AuthStore {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly api = inject(Gstr1GstzenAuthService);
  private readonly storage = inject(Gstr1TokenStorageService);
  private readonly config = inject(GSTR1_GSTZEN_AUTH_CONFIG);

  readonly status = signal<Gstr1AuthStatus>('idle');
  readonly errorMessage = signal<string | null>(null);

  readonly accessToken = signal<string | null>(null);
  readonly refreshToken = signal<string | null>(null);
  readonly expiresAtMs = signal<number | null>(null);
  readonly username = signal<string | null>(null);

  /** Browser: true after storage hydrate; server: true immediately. */
  readonly authResolved = signal(false);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.hydrateFromStorage();
    }
    this.authResolved.set(true);
  }

  private defaultTtlMs(): number {
    return this.config.accessTokenFallbackTtlMs ?? 86_400_000;
  }

  private computeExpiryMs(accessToken: string): number {
    const unix = readJwtExpiryUnixSec(accessToken);
    if (unix != null) {
      return unix * 1000;
    }
    return Date.now() + this.defaultTtlMs();
  }

  private hydrateFromStorage(): void {
    const saved = this.storage.load();
    if (!saved) {
      return;
    }
    if (Date.now() >= saved.expiresAtMs) {
      this.storage.clear();
      return;
    }
    this.accessToken.set(saved.accessToken);
    this.refreshToken.set(saved.refreshToken);
    this.expiresAtMs.set(saved.expiresAtMs);
    this.username.set(saved.username || null);
    this.status.set('authenticated');
  }

  /** Copies current access JWT to the clipboard (browser only). Returns whether it succeeded. */
  async copyAccessTokenToClipboard(): Promise<boolean> {
    return this.copyToClipboard(this.accessToken());
  }

  /** Copies current refresh JWT to the clipboard (browser only). Returns whether it succeeded. */
  async copyRefreshTokenToClipboard(): Promise<boolean> {
    return this.copyToClipboard(this.refreshToken());
  }

  private async copyToClipboard(value: string | null): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId) || !value) {
      return false;
    }
    const cb = globalThis.navigator?.clipboard;
    if (!cb?.writeText) {
      return false;
    }
    try {
      await cb.writeText(value);
      return true;
    } catch {
      return false;
    }
  }

  hasValidToken(): boolean {
    const token = this.accessToken();
    if (!token) {
      return false;
    }
    const exp = this.expiresAtMs();
    if (exp != null && Date.now() >= exp) {
      return false;
    }
    return true;
  }

  clearError(): void {
    this.errorMessage.set(null);
    if (this.status() === 'error') {
      this.status.set('idle');
    }
  }

  async login(username: string, password: string): Promise<void> {
    this.errorMessage.set(null);
    this.status.set('loading');
    try {
      const pair = await firstValueFrom(this.api.login(username, password));
      const expiresAtMs = this.computeExpiryMs(pair.access);
      this.accessToken.set(pair.access);
      this.refreshToken.set(pair.refresh);
      this.expiresAtMs.set(expiresAtMs);
      this.username.set(username.trim());
      this.storage.save({
        accessToken: pair.access,
        refreshToken: pair.refresh,
        expiresAtMs,
        username: username.trim(),
      });
      this.status.set('authenticated');
    } catch (e) {
      this.status.set('error');
      const msg = e instanceof Gstr1AuthError ? e.message : 'Could not sign in to GSTZen.';
      this.errorMessage.set(msg);
      throw e;
    }
  }

  logout(): void {
    this.storage.clear();
    this.accessToken.set(null);
    this.refreshToken.set(null);
    this.expiresAtMs.set(null);
    this.username.set(null);
    this.errorMessage.set(null);
    this.status.set('idle');
  }

  /** Called when an API responds 401 to GSTZen-proxied URLs. */
  sessionExpired(): void {
    this.storage.clear();
    this.accessToken.set(null);
    this.refreshToken.set(null);
    this.expiresAtMs.set(null);
    this.username.set(null);
    this.errorMessage.set('GSTZen session expired. Please sign in again.');
    this.status.set('idle');
  }
}
