import {
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn } from '@angular/router';
import { Observable, of } from 'rxjs';

/**
 * Always allow `/gstr1/login` so the two-step flow (token → OTP) is shown every visit.
 * Users complete Step 1 and Step 2 on this page before continuing via Continue.
 */
export const gstr1LoginRedirectGuard: CanActivateFn = (): Observable<boolean> => {
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) {
    return of(true);
  }

  return of(true);
};
