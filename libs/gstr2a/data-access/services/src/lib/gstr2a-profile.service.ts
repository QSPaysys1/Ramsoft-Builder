import { inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { AuthStore } from '@ramsoft-builder/auth/data-access/auth';
import { UserProfileRepository } from '@ramsoft-builder/e-invoices/data-access/einvoice';
import { pickProfileString } from '@ramsoft-builder/gstr2a/utils/helpers';
import { catchError, of, switchMap } from 'rxjs';

/** Legal/trade name for GSTR-2A section headers (Supabase profile). */
@Injectable({ providedIn: 'root' })
export class Gstr2aProfileService {
  private readonly authStore = inject(AuthStore);
  private readonly userProfile = inject(UserProfileRepository);

  readonly legalName = signal('');
  readonly tradeName = signal('');

  constructor() {
    toObservable(this.authStore.user)
      .pipe(
        switchMap((user) => {
          if (!user?.id) {
            return of(undefined);
          }
          return this.userProfile.watchProfileData(user.id).pipe(
            catchError(() => of(undefined)),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((prof) => {
        const p = prof as Record<string, unknown> | undefined;
        this.legalName.set(
          pickProfileString(p, [
            'legal_name',
            'legalName',
            'LegalName',
            'companyName',
            'CompanyName',
            'organizationName',
            'name',
            'Name',
          ]),
        );
        this.tradeName.set(
          pickProfileString(p, [
            'tradeName',
            'TradeName',
            'trade_name',
            'dba',
          ]),
        );
      });
  }
}
