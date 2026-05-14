import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Gstr1AuthStore } from './gstr1-auth.store';
import { GSTR1_GSTZEN_AUTH_CONFIG } from './gstr1-gstzen-auth.config';

function matchesPrefix(url: string, prefixes: readonly string[]): boolean {
  return prefixes.some((p) => p.length > 0 && url.startsWith(p));
}

function isGstZenLoginTokenRequest(url: string): boolean {
  return url.includes('/accounts/api/login/token');
}

/** Attaches `Authorization: Bearer` for GSTZen API calls (see environment `bearerUrlPrefixes`). */
export const gstr1BearerInterceptor: HttpInterceptorFn = (req, next) => {
  const store = inject(Gstr1AuthStore);
  const config = inject(GSTR1_GSTZEN_AUTH_CONFIG);
  const url = req.url;

  if (isGstZenLoginTokenRequest(url) || !matchesPrefix(url, config.bearerUrlPrefixes)) {
    return next(req);
  }

  const token = store.accessToken();
  if (!token || !store.hasValidToken()) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }),
  );
};
