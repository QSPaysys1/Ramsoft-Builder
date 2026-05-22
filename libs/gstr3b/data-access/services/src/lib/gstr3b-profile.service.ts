import { inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { AuthStore } from '@ramsoft-builder/auth/data-access/auth';
import { UserProfileRepository } from '@ramsoft-builder/e-invoices/data-access/einvoice';
import { pickProfileString } from '@ramsoft-builder/gstr3b/utils/helpers';
import { catchError, of, switchMap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class Gstr3bProfileService {
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
        this.legalName.set(pickProfileString(p, ['legal_name', 'legalName', 'companyName', 'name']));
        this.tradeName.set(pickProfileString(p, ['tradeName', 'trade_name']));
      });
  }
}
