import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

const STORAGE_KEY = 'ramsoft_gstzen_ewb_test_token';

@Injectable({ providedIn: 'root' })
export class GstZenEwbTokenPrefsService {
  private readonly platformId = inject(PLATFORM_ID);

  /**
   * When true and `GSTZEN_EWB_HTTP_CONFIG.ewbTestToken` is set, standalone e-way POST uses that token
   * instead of the primary `token` (original GSTZen workspace).
   */
  readonly useEwbTestToken = signal(this.readInitial());

  private readInitial(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (raw === null || raw === '') {
      return false;
    }
    return raw === '1' || raw === 'true';
  }

  setUseEwbTestToken(value: boolean): void {
    this.useEwbTestToken.set(value);
    if (isPlatformBrowser(this.platformId)) {
      globalThis.localStorage?.setItem(STORAGE_KEY, value ? '1' : '0');
    }
  }
}
