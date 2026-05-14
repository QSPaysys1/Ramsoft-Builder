import {
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject, NgZone, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { Gstr1AuthStore } from './gstr1-auth.store';
import { GSTR1_GSTZEN_AUTH_CONFIG } from './gstr1-gstzen-auth.config';

function matchesPrefix(url: string, prefixes: readonly string[]): boolean {
  return prefixes.some((p) => p.length > 0 && url.startsWith(p));
}

function isGstZenLoginTokenRequest(url: string): boolean {
  return url.includes('/accounts/api/login/token');
}

/**
 * On 401 from GSTZen-proxied APIs, clears the GSTZen JWT session and sends the user to login.
 */
export const gstr1UnauthorizedInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  const store = inject(Gstr1AuthStore);
  const config = inject(GSTR1_GSTZEN_AUTH_CONFIG);
  const router = inject(Router);
  const zone = inject(NgZone);

  return next(req).pipe(
    catchError((err: unknown) => {
      if (!isPlatformBrowser(platformId)) {
        return throwError(() => err);
      }
      if (!(err instanceof HttpErrorResponse) || err.status !== 401) {
        return throwError(() => err);
      }
      const url = req.url;
      if (!matchesPrefix(url, config.unauthorizedUrlPrefixes)) {
        return throwError(() => err);
      }
      if (isGstZenLoginTokenRequest(url)) {
        return throwError(() => err);
      }

      store.sessionExpired();
      zone.run(() => {
        void router.navigateByUrl('/gstr1/login', { replaceUrl: true });
      });
      return throwError(() => err);
    }),
  );
};
