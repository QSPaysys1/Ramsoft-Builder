import { DatePipe, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { AuthStore } from '@ramsoft-builder/auth/data-access/auth';
import { UserProfileRepository } from '@ramsoft-builder/e-invoices/data-access/einvoice';
import { Gstr1GstnCheckSessionModalComponent } from './gstr1-gstn-check-session.modal';
import { Gstr1GstnRefreshSessionModalComponent } from './gstr1-gstn-refresh-session.modal';
import { AuthToastService } from '@ramsoft-builder/auth/ui/login';
import { Gstr1AuthStore } from '@ramsoft-builder/gstr1/data-access/gstzen-auth';
import { catchError, combineLatest, map, of, switchMap } from 'rxjs';
import {
  parseGstr1ProfileGstCredentials,
  type Gstr1ProfileGstCredentials,
} from '../utils/gstr1-profile-credentials.utils';

const EMPTY_CREDENTIALS: Gstr1ProfileGstCredentials = {
  gstin: '',
  portalUsername: '',
  gstZenUsername: '',
  gstZenPassword: '',
};

@Component({
  selector: 'lib-gstr1-workspace-session-page',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    Gstr1GstnCheckSessionModalComponent,
    Gstr1GstnRefreshSessionModalComponent,
  ],
  templateUrl: './gstr1-workspace-session.page.html',
  host: {
    class: 'block w-full',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Gstr1WorkspaceSessionPageComponent {
  private readonly router = inject(Router);
  private readonly toast = inject(AuthToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly authStore = inject(AuthStore);
  private readonly userProfile = inject(UserProfileRepository);
  readonly gstr1Auth = inject(Gstr1AuthStore);

  readonly checkSessionModalOpen = signal(false);
  readonly refreshSessionModalOpen = signal(false);
  readonly profileResolved = signal(false);
  readonly profileCredentials = signal<Gstr1ProfileGstCredentials>(EMPTY_CREDENTIALS);

  readonly username = computed(() => this.gstr1Auth.username());
  readonly expiresAtMs = computed(() => this.gstr1Auth.expiresAtMs());
  readonly hasToken = computed(() => this.gstr1Auth.hasValidToken());
  readonly accessTokenText = computed(() => this.gstr1Auth.accessToken() ?? '');
  readonly refreshTokenText = computed(() => this.gstr1Auth.refreshToken() ?? '');

  readonly loggedUserConsoleText = computed(() => {
    const user = this.authStore.user();
    const creds = this.profileCredentials();
    const payload = {
      ramsoftUser: user
        ? {
            id: user.id,
            email: user.email,
            displayName: user.displayName ?? null,
          }
        : null,
      gstrSession: {
        gstin: creds.gstin,
        gstPortalUsername: creds.portalUsername,
        gstZenUsername: creds.gstZenUsername,
        gstZenPasswordSet: creds.gstZenPassword.length > 0,
      },
      gstZenSignedInAs: this.gstr1Auth.username(),
      gstZenTokenActive: this.gstr1Auth.hasValidToken(),
    };
    return JSON.stringify(payload, null, 2);
  });

  constructor() {
    toObservable(this.authStore.user)
      .pipe(
        switchMap((user) => {
          if (!user?.id) {
            this.profileCredentials.set(EMPTY_CREDENTIALS);
            this.profileResolved.set(true);
            return of(null);
          }
          this.profileResolved.set(false);
          return combineLatest([
            this.userProfile.watchProfileData(user.id).pipe(
              catchError(() => of(undefined)),
            ),
            this.userProfile.watchLegacyUserFlat(user.id).pipe(
              catchError(() => of(undefined)),
            ),
          ]).pipe(
            map(([prof, flat]) => ({
              prof: prof as Record<string, unknown> | undefined,
              flat,
              email: user.email,
            })),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((bundle) => {
        if (!bundle) {
          return;
        }
        const creds = parseGstr1ProfileGstCredentials(
          bundle.prof,
          bundle.flat,
          bundle.email,
        );
        this.profileCredentials.set(creds);
        this.profileResolved.set(true);
        this.logLoggedUserConsole();
      });
  }

  private logLoggedUserConsole(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    console.log('[GSTR1 workspace] logged user', JSON.parse(this.loggedUserConsoleText()));
  }

  openCheckSessionModal(): void {
    this.checkSessionModalOpen.set(true);
  }

  closeCheckSessionModal(): void {
    this.checkSessionModalOpen.set(false);
  }

  closeRefreshSessionModal(): void {
    this.refreshSessionModalOpen.set(false);
  }

  openRefreshSessionModal(): void {
    this.refreshSessionModalOpen.set(true);
  }

  logout(): void {
    this.gstr1Auth.logout();
    void this.router.navigateByUrl('/gstr1/login', { replaceUrl: true });
  }

  async copyAccessToken(): Promise<void> {
    const ok = await this.gstr1Auth.copyAccessTokenToClipboard();
    this.toast.show(
      ok ? 'success' : 'error',
      ok ? 'Access token copied to clipboard.' : 'Could not copy access token.',
      5000,
    );
  }

  async copyRefreshToken(): Promise<void> {
    const ok = await this.gstr1Auth.copyRefreshTokenToClipboard();
    this.toast.show(
      ok ? 'success' : 'error',
      ok ? 'Refresh token copied to clipboard.' : 'Could not copy refresh token.',
      5000,
    );
  }
}
