import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { GSTR1_GSTZEN_AUTH_CONFIG } from './gstr1-gstzen-auth.config';

export interface Gstr1PersistedSession {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresAtMs: number;
  /** GSTZen username / email used at login (for UI). */
  readonly username: string;
}

@Injectable({ providedIn: 'root' })
export class Gstr1TokenStorageService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly config = inject(GSTR1_GSTZEN_AUTH_CONFIG);

  private keys(): {
    access: string;
    refresh: string;
    expiresAt: string;
    username: string;
  } {
    const base = this.config.storageKeyPrefix ?? 'ramsoft.gstr1.auth';
    return {
      access: `${base}.access`,
      refresh: `${base}.refresh`,
      expiresAt: `${base}.expiresAtMs`,
      username: `${base}.username`,
    };
  }

  load(): Gstr1PersistedSession | null {
    if (!isPlatformBrowser(this.platformId) || !globalThis.localStorage) {
      return null;
    }
    const k = this.keys();
    const accessToken = globalThis.localStorage.getItem(k.access);
    const refreshToken = globalThis.localStorage.getItem(k.refresh);
    const expiresRaw = globalThis.localStorage.getItem(k.expiresAt);
    const username = globalThis.localStorage.getItem(k.username) ?? '';
    const expiresAtMs = expiresRaw ? Number(expiresRaw) : NaN;
    if (!accessToken || !refreshToken || !Number.isFinite(expiresAtMs)) {
      return null;
    }
    return { accessToken, refreshToken, expiresAtMs, username };
  }

  save(session: Gstr1PersistedSession): void {
    if (!isPlatformBrowser(this.platformId) || !globalThis.localStorage) {
      return;
    }
    const k = this.keys();
    globalThis.localStorage.setItem(k.access, session.accessToken);
    globalThis.localStorage.setItem(k.refresh, session.refreshToken);
    globalThis.localStorage.setItem(k.expiresAt, String(session.expiresAtMs));
    globalThis.localStorage.setItem(k.username, session.username);
  }

  clear(): void {
    if (!isPlatformBrowser(this.platformId) || !globalThis.localStorage) {
      return;
    }
    const k = this.keys();
    globalThis.localStorage.removeItem(k.access);
    globalThis.localStorage.removeItem(k.refresh);
    globalThis.localStorage.removeItem(k.expiresAt);
    globalThis.localStorage.removeItem(k.username);
  }
}
