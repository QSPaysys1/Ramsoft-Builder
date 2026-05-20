import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  Gstr1GstnOtpApiService,
  gstr2CdnLogicalError,
  parseGstr2CdnBundle,
  type Gstr2aCdnBundle,
} from '@ramsoft-builder/gstr1/data-access/gstzen-auth';

@Injectable({ providedIn: 'root' })
export class Gstr2aCdnCacheService {
  private readonly api = inject(Gstr1GstnOtpApiService);

  private cacheKey = '';
  readonly bundle = signal<Gstr2aCdnBundle | null>(null);
  readonly loadError = signal<string | null>(null);

  cacheKeyFor(gstin: string, retPeriod: string): string {
    return `${gstin.trim().toUpperCase()}::${retPeriod.trim()}`;
  }

  hasCached(gstin: string, retPeriod: string): boolean {
    return (
      this.cacheKey === this.cacheKeyFor(gstin, retPeriod) &&
      this.bundle() !== null
    );
  }

  async ensureBundle(
    gstin: string,
    retPeriod: string,
  ): Promise<Gstr2aCdnBundle | null> {
    const key = this.cacheKeyFor(gstin, retPeriod);
    if (this.cacheKey === key && this.bundle()) {
      return this.bundle();
    }
    this.loadError.set(null);
    try {
      const payload = await firstValueFrom(
        this.api.fetchGstr2Cdn({
          gstin: gstin.trim().toUpperCase(),
          ret_period: retPeriod.trim(),
        }),
      );
      const err = gstr2CdnLogicalError(payload);
      if (err) {
        this.loadError.set(err);
        this.bundle.set(null);
        this.cacheKey = '';
        return null;
      }
      const parsed = parseGstr2CdnBundle(payload);
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
