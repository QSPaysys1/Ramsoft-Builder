import {
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRouteSnapshot, CanActivateFn, Router, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { safeInternalNavigateUrl } from '@ramsoft-builder/auth/data-access/auth';
import { Gstr1AuthStore } from './gstr1-auth.store';

/**
 * If the GSTZen session is already valid, redirect away from `/gstr1/login`
 * to `returnUrl` (safe, same-origin) or `/home`.
 */
export const gstr1LoginRedirectGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
): Observable<boolean | UrlTree> => {
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);
  const store = inject(Gstr1AuthStore);

  if (!isPlatformBrowser(platformId)) {
    return of(true);
  }

  if (!store.hasValidToken()) {
    return of(true);
  }

  const raw = route.queryParamMap.get('returnUrl');
  const target = safeInternalNavigateUrl(raw, '/home');
  return of(router.parseUrl(target));
};
