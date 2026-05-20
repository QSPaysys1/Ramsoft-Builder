import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  Gstr1GstnOtpApiService,
  gstr2TdstcsLogicalError,
  parseGstr2TdsTcsBundle,
  type Gstr2aTdsTcsBundle,
} from '@ramsoft-builder/gstr1/data-access/gstzen-auth';

@Injectable({ providedIn: 'root' })
export class Gstr2aTdsTcsCacheService {
  private readonly api = inject(Gstr1GstnOtpApiService);

  private cacheKey = '';
  readonly bundle = signal<Gstr2aTdsTcsBundle | null>(null);
  readonly loadError = signal<string | null>(null);

  cacheKeyFor(gstin: string, retPeriod: string): string {
    return `${gstin.trim().toUpperCase()}::${retPeriod.trim()}`;
  }

  async ensureBundle(
    gstin: string,
    retPeriod: string,
  ): Promise<Gstr2aTdsTcsBundle | null> {
    const key = this.cacheKeyFor(gstin, retPeriod);
    if (this.cacheKey === key && this.bundle()) {
      return this.bundle();
    }
    this.loadError.set(null);
    try {
      const payload = await firstValueFrom(
        this.api.fetchGstr2Tdstcs({
          gstin: gstin.trim().toUpperCase(),
          ret_period: retPeriod.trim(),
        }),
      );
      const err = gstr2TdstcsLogicalError(payload);
      if (err) {
        this.loadError.set(err);
        this.bundle.set(null);
        this.cacheKey = '';
        return null;
      }
      const parsed = parseGstr2TdsTcsBundle(payload);
      this.cacheKey = key;
      this.bundle.set(parsed);
      return parsed;
    } catch (e: unknown) {
      this.loadError.set(e instanceof Error ? e.message : String(e));
      this.bundle.set(null);
      this.cacheKey = '';
      return null;
    }
  }

  clear(): void {
    this.cacheKey = '';
    this.bundle.set(null);
    this.loadError.set(null);
  }
}
