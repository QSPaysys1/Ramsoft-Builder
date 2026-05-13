import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

const STORAGE_KEY = 'ramsoft_gstzen_ewb_gstin_header';

@Injectable({ providedIn: 'root' })
export class GstZenEwbHeaderPrefsService {
  private readonly platformId = inject(PLATFORM_ID);

  /**
   * When true, standalone e-way POST includes HTTP header `gstin` (consignor `fromGstin`).
   * Persisted in localStorage; default true when unset (matches Postman / GSTZen testing).
   */
  readonly includeGstinHeader = signal(this.readInitial());

  private readInitial(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return true;
    }
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (raw === null || raw === '') {
      return true;
    }
    return raw === '1' || raw === 'true';
  }

  setIncludeGstinHeader(value: boolean): void {
    this.includeGstinHeader.set(value);
    if (isPlatformBrowser(this.platformId)) {
      globalThis.localStorage?.setItem(STORAGE_KEY, value ? '1' : '0');
    }
  }
}
