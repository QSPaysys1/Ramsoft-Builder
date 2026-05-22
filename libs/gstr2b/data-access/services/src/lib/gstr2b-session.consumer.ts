import { computed, inject, Injectable } from '@angular/core';
import { Gstr1AuthStore } from '@ramsoft-builder/gstr1/data-access/gstzen-auth';

/**
 * Read-only GSTZen session for GSTR-2B.
 * Refer GSTR-1 authentication/session establishment flow (`/gstr1/login`).
 * Do not implement a separate login here.
 */
@Injectable({ providedIn: 'root' })
export class Gstr2bSessionConsumer {
  private readonly gstr1Auth = inject(Gstr1AuthStore);

  readonly accessToken = this.gstr1Auth.accessToken;
  readonly authResolved = this.gstr1Auth.authResolved;
  readonly status = this.gstr1Auth.status;

  readonly isAuthenticated = computed(
    () => this.gstr1Auth.status() === 'authenticated',
  );

  hasValidToken(): boolean {
    return this.gstr1Auth.hasValidToken();
  }

  loginRedirectUrl(returnUrl: string): string {
    return `/gstr1/login?returnUrl=${encodeURIComponent(returnUrl)}`;
  }
}
