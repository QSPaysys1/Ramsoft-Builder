import { HttpErrorResponse } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  AuthStore,
  safeInternalNavigateUrl,
} from '@ramsoft-builder/auth/data-access/auth';
import {
  AuthPageLayoutComponent,
  AuthServerErrorComponent,
  AuthToastService,
} from '@ramsoft-builder/auth/ui/login';
import { UserProfileRepository } from '@ramsoft-builder/e-invoices/data-access/einvoice';
import {
  Gstr1AuthStore,
  Gstr1GstnOtpApiService,
} from '@ramsoft-builder/gstr1/data-access/gstzen-auth';
import { catchError, combineLatest, firstValueFrom, map, of, switchMap } from 'rxjs';
import {
  gstr1ProfileGstCredentialsMissingLabels,
  parseGstr1ProfileGstCredentials,
  type Gstr1ProfileGstCredentials,
} from '../utils/gstr1-profile-credentials.utils';

type LoginFlowStep = 'token' | 'requestOtp' | 'establish' | 'complete';

const EMPTY_CREDENTIALS: Gstr1ProfileGstCredentials = {
  gstin: '',
  portalUsername: '',
  gstZenUsername: '',
  gstZenPassword: '',
};

@Component({
  selector: 'lib-gstr1-login-page',
  standalone: true,
  host: {
    ngSkipHydration: '',
  },
  imports: [
    ReactiveFormsModule,
    RouterLink,
    AuthPageLayoutComponent,
    AuthServerErrorComponent,
  ],
  templateUrl: './gstr1-login.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Gstr1LoginPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  readonly gstr1Auth = inject(Gstr1AuthStore);
  private readonly gstnApi = inject(Gstr1GstnOtpApiService);
  private readonly toast = inject(AuthToastService);
  private readonly authStore = inject(AuthStore);
  private readonly userProfile = inject(UserProfileRepository);

  private tokenActionLocked = false;

  readonly heroImageSrc = 'assets/img/ramsoftmillersmelody.png';

  readonly flowStep = signal<LoginFlowStep>('token');
  readonly otpRequestLoading = signal(false);
  readonly establishLoading = signal(false);
  readonly otpRequestError = signal<string | null>(null);
  readonly establishError = signal<string | null>(null);
  readonly profileResolved = signal(false);

  readonly profileCredentials = signal<Gstr1ProfileGstCredentials>(EMPTY_CREDENTIALS);

  readonly establishOtpForm = this.fb.nonNullable.group({
    otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  readonly tokenLoading = computed(() => this.gstr1Auth.status() === 'loading');

  readonly resolvedGstin = computed(() => this.profileCredentials().gstin);

  readonly portalUsername = computed(() => this.profileCredentials().portalUsername);

  readonly gstZenUsername = computed(() => this.profileCredentials().gstZenUsername);

  readonly gstZenPasswordMasked = computed(() => {
    const len = this.profileCredentials().gstZenPassword.length;
    return len > 0 ? '•'.repeat(Math.min(len, 12)) : '';
  });

  readonly gstZenCredentialsReady = computed(() => {
    const c = this.profileCredentials();
    return c.gstZenUsername.trim().length > 0 && c.gstZenPassword.length > 0;
  });

  readonly step1Complete = computed(() => this.gstr1Auth.hasValidToken());

  readonly showStep2 = computed(() => {
    const s = this.flowStep();
    return s === 'requestOtp' || s === 'establish' || s === 'complete';
  });

  readonly showStep3 = computed(() => {
    const s = this.flowStep();
    return s === 'establish' || s === 'complete';
  });

  readonly gstFieldsReady = computed(
    () =>
      this.resolvedGstin().length === 15 &&
      this.portalUsername().trim().length > 0,
  );

  readonly credentialsMissingHint = computed(() => {
    const missing = gstr1ProfileGstCredentialsMissingLabels(this.profileCredentials());
    if (missing.length === 0) {
      return '';
    }
    return `Add to your user profile (profiles.data): ${missing.join(', ')}.`;
  });

  constructor() {
    afterNextRender(() => {
      this.resetFlowForVisit();
    });

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
      });
  }

  private resetFlowForVisit(): void {
    this.otpRequestError.set(null);
    this.establishError.set(null);
    this.flowStep.set('token');
    if (this.gstr1Auth.hasValidToken()) {
      this.flowStep.set('requestOtp');
    }
  }

  async generateToken(): Promise<void> {
    if (this.tokenActionLocked || this.tokenLoading()) {
      return;
    }
    if (!this.gstZenCredentialsReady()) {
      this.toast.show('error', this.credentialsMissingHint(), 8000);
      return;
    }

    const { gstZenUsername, gstZenPassword } = this.profileCredentials();

    this.tokenActionLocked = true;
    this.gstr1Auth.clearError();
    this.otpRequestError.set(null);
    this.establishError.set(null);
    this.toast.clear();
    const toastId = this.toast.show('info', 'Generating GSTZen token…', 0);

    try {
      await this.gstr1Auth.login(gstZenUsername, gstZenPassword);
      this.toast.dismiss(toastId);
      this.toast.show('success', 'GSTZen token generated.', 4000);
      this.flowStep.set('requestOtp');
    } catch {
      this.toast.dismiss(toastId);
      this.toast.show(
        'error',
        this.gstr1Auth.errorMessage() ??
          'Could not generate GSTZen token. Please try again.',
        8000,
      );
    } finally {
      this.tokenActionLocked = false;
    }
  }

  async generateOtp(): Promise<void> {
    if (this.otpRequestLoading() || !this.showStep2()) {
      return;
    }
    if (!this.gstFieldsReady()) {
      this.otpRequestError.set(this.credentialsMissingHint());
      return;
    }
    if (!this.gstr1Auth.hasValidToken()) {
      this.otpRequestError.set('Generate token first (Step 1).');
      this.flowStep.set('token');
      return;
    }

    this.otpRequestLoading.set(true);
    this.otpRequestError.set(null);
    this.establishError.set(null);

    try {
      await firstValueFrom(
        this.gstnApi.generateOtp({
          gstin: this.resolvedGstin(),
          username: this.portalUsername(),
        }),
      );
      this.toast.show('success', 'OTP sent on GST portal. Enter it in Step 3.', 6000);
      this.establishOtpForm.reset({ otp: '' });
      this.flowStep.set('establish');
    } catch (err: unknown) {
      this.otpRequestError.set(this.formatApiError(err));
    } finally {
      this.otpRequestLoading.set(false);
    }
  }

  async establishSession(): Promise<void> {
    if (this.establishLoading() || !this.showStep3()) {
      return;
    }
    if (this.establishOtpForm.invalid) {
      this.establishOtpForm.markAllAsTouched();
      return;
    }
    if (!this.gstr1Auth.hasValidToken()) {
      this.establishError.set('Generate token first (Step 1).');
      this.flowStep.set('token');
      return;
    }

    const otp = this.establishOtpForm.controls.otp.getRawValue().trim();

    this.establishLoading.set(true);
    this.establishError.set(null);

    try {
      await firstValueFrom(
        this.gstnApi.establishSession({
          gstin: this.resolvedGstin(),
          otp,
        }),
      );
      this.flowStep.set('complete');
      this.toast.show('success', 'GST session established.', 4000);
      await this.navigateAfterSuccess();
    } catch (err: unknown) {
      this.establishError.set(this.formatApiError(err));
    } finally {
      this.establishLoading.set(false);
    }
  }

  private async navigateAfterSuccess(): Promise<void> {
    const fallback = '/home';
    const target = safeInternalNavigateUrl(
      this.route.snapshot.queryParamMap.get('returnUrl'),
      fallback,
    );

    if (isPlatformBrowser(this.platformId)) {
      await this.router.navigateByUrl(target, { replaceUrl: true });
    }
  }

  private formatApiError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error;
      if (typeof body === 'object' && body !== null) {
        const msg = (body as { message?: string; detail?: string }).message
          ?? (body as { detail?: string }).detail;
        if (typeof msg === 'string' && msg.trim()) {
          return msg.trim();
        }
      }
      if (typeof body === 'string' && body.trim()) {
        return body.trim();
      }
      return `Request failed (${err.status}).`;
    }
    if (err instanceof Error) {
      return err.message;
    }
    return 'Request failed. Please try again.';
  }
}
