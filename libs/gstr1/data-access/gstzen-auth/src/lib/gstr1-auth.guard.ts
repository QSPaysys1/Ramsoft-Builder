import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { Gstr1AuthStore } from './gstr1-auth.store';

/** Requires a valid GSTZen access token (JWT). */
export const gstr1AuthGuard: CanActivateFn = (_route, state): Observable<boolean | UrlTree> => {
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);
  const store = inject(Gstr1AuthStore);

  if (!isPlatformBrowser(platformId)) {
    return of(
      router.createUrlTree(['/gstr1/login'], {
        queryParams: { returnUrl: state.url },
      }),
    );
  }

  if (store.hasValidToken()) {
    return of(true);
  }

  return of(
    router.createUrlTree(['/gstr1/login'], {
      queryParams: { returnUrl: state.url },
    }),
  );
};
