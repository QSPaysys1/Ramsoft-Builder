import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { toObservable } from '@angular/core/rxjs-interop';
import type { ActivatedRouteSnapshot } from '@angular/router';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthStore, type AppUser } from './auth.store';
import { safeInternalNavigateUrl } from './safe-internal-return-url';
import {
  filter,
  map,
  take,
  timeout,
  catchError,
  of,
  switchMap,
  debounceTime,
  Observable,
} from 'rxjs';

const AUTH_WAIT_MS = 8000;

/** Wait until `user` is non-null or timeout (session restore after refresh). */
function waitForAuthenticatedUser$(authStore: AuthStore): Observable<boolean> {
  const current = authStore.user();
  if (current) {
    return of(true);
  }
  return toObservable(authStore.user).pipe(
    debounceTime(0),
    filter((u): u is AppUser => u != null),
    take(1),
    timeout({ first: AUTH_WAIT_MS }),
    map(() => true),
    catchError(() => of(false)),
  );
}

export const authGuard: CanActivateFn = (_route, state): Observable<boolean | UrlTree> => {
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);
  const authStore = inject(AuthStore);

  if (!isPlatformBrowser(platformId)) {
    return of(
      router.createUrlTree(['/login'], {
        queryParams: { returnUrl: state.url },
      }),
    );
  }

  return toObservable(authStore.authResolved).pipe(
    filter((v) => v === true),
    take(1),
    switchMap(() => waitForAuthenticatedUser$(authStore)),
    map((ok) =>
      ok
        ? true
        : router.createUrlTree(['/login'], {
            queryParams: { returnUrl: state.url },
          }),
    ),
    catchError(() =>
      of(
        router.createUrlTree(['/login'], {
          queryParams: { returnUrl: state.url },
        }),
      ),
    ),
  );
};

/** Redirects authenticated users away from login (e.g. to `returnUrl` or `/home`). */
export const loginRedirectGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
): Observable<boolean | UrlTree> => {
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);
  const authStore = inject(AuthStore);

  if (!isPlatformBrowser(platformId)) {
    return of(true);
  }

  return toObservable(authStore.authResolved).pipe(
    filter((v) => v === true),
    take(1),
    switchMap(() => waitForAuthenticatedUser$(authStore)),
    map((ok) => {
      if (!ok) {
        return true;
      }
      const raw = route.queryParamMap.get('returnUrl');
      const target = safeInternalNavigateUrl(raw, '/home');
      console.debug('[auth] loginRedirectGuard redirect', { target, raw });
      return router.parseUrl(target);
    }),
    catchError(() => of(true)),
  );
};
