import { HttpClient } from '@angular/common/http';
import { type Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

/**
 * Public GSTIN search (same as e-invoice / e-waybill flows; replace with env or proxy in production).
 */
export const GSTIN_SEARCH_TAXPAYER_BASE =
  'https://searchtaxpayer-3syvsriwua-uc.a.run.app';

/** Required query param on that endpoint (legacy `checkGSTIN`). */
export const GSTIN_SEARCH_TAXPAYER_EMAIL = 'ajay.a02@gmail.com';

export interface GstinTaxpayerDisplayNames {
  /** Trade name from API (`tradeNam`). */
  readonly tradeNam: string;
  /** Legal name (`lgnm`). */
  readonly lgnm: string;
}

interface GstSearchTaxpayerResponse {
  error?: boolean;
  message?: string;
  data: {
    gstin: string;
    tradeNam?: string;
    lgnm?: string;
  } | null;
}

/**
 * Fetches trade + legal name for display on GSTR-1 forms. Returns `null` if lookup fails or has no data.
 */
export function fetchGstinTaxpayerDisplayNames$(
  http: HttpClient,
  gstin: string,
): Observable<GstinTaxpayerDisplayNames | null> {
  const g = gstin.trim().toUpperCase();
  if (g.length !== 15) {
    return of(null);
  }
  const q = new URLSearchParams({
    gstin: g,
    email: GSTIN_SEARCH_TAXPAYER_EMAIL,
  });
  const url = `${GSTIN_SEARCH_TAXPAYER_BASE}?${q.toString()}`;
  return http.get<GstSearchTaxpayerResponse>(url).pipe(
    map((res) => {
      if (!res || res.error || !res.data) {
        return null;
      }
      const d = res.data;
      const trade = (d.tradeNam ?? '').trim();
      const legal = (d.lgnm ?? '').trim();
      if (!trade && !legal) {
        return null;
      }
      return { tradeNam: trade, lgnm: legal };
    }),
    catchError(() => of(null)),
  );
}
