import {
  ChangeDetectionStrategy,
  Component,
  inject,
  computed,
  DestroyRef,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AuthStore,
  safeInternalNavigateUrl,
} from '@ramsoft-builder/auth/data-access/auth';
import {
  AuthPageLayoutComponent,
  AuthUserNameFieldComponent,
  AuthPasswordFieldComponent,
  AuthFinancialYearFieldComponent,
  AuthServerErrorComponent,
  AuthSubmitButtonComponent,
  AuthToastService,
} from '@ramsoft-builder/auth/ui/login';

@Component({
  selector: 'lib-login-page',
  standalone: true,
  host: {
    ngSkipHydration: '',
  },
  imports: [
    ReactiveFormsModule,
    AuthPageLayoutComponent,
    AuthUserNameFieldComponent,
    AuthPasswordFieldComponent,
    AuthFinancialYearFieldComponent,
    AuthSubmitButtonComponent,
    AuthServerErrorComponent,
  ],
  templateUrl: './login-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  readonly authStore = inject(AuthStore);
  private readonly toast = inject(AuthToastService);

  /** Prevents double submit (e.g. hydration event replay + user click). */
  private submitLocked = false;

  readonly heroImageSrc = 'assets/img/ramsoftmillersmelody.png';

  readonly loginForm = this.fb.nonNullable.group({
    userName: ['', [Validators.required]],
    password: [
      '',
      [Validators.required, Validators.minLength(6), Validators.maxLength(128)],
    ],
    financialYear: ['2026-2027', [Validators.required]],
  });

  readonly loading = computed(() => this.authStore.status() === 'loading');

  constructor() {
    this.loginForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.authStore.clearError());
  }

  async onSubmit(): Promise<void> {
    if (this.submitLocked) {
      return;
    }
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.toast.show(
        'error',
        'Please enter your email or user name, password, and financial year.',
        6000,
      );
      return;
    }
    this.submitLocked = true;
    const { userName, password, financialYear } = this.loginForm.getRawValue();
    this.toast.clear();
    const signingInId = this.toast.show('info', 'Signing in…', 0);
    try {
      await this.authStore.loginWithUserNamePassword(userName, password);
      this.toast.dismiss(signingInId);
      this.toast.show(
        'success',
        'Signed in successfully. Taking you to the dashboard…',
        5000,
      );
      if (isPlatformBrowser(this.platformId)) {
        sessionStorage.setItem('financialYear', financialYear);
        globalThis.localStorage?.setItem('fy', financialYear);
        console.log('[auth] login FY stored for dashboard', { financialYear });
      }
      const u = this.authStore.user();
      const fallback = `/home?fy=${encodeURIComponent(financialYear)}`;
      const target = safeInternalNavigateUrl(
        this.route.snapshot.queryParamMap.get('returnUrl'),
        fallback,
      );
      console.log('[auth] login successful — navigating', {
        userId: u?.id,
        email: u?.email,
        displayName: u?.displayName,
        target,
      });
      await this.router.navigateByUrl(target, { replaceUrl: true });
      console.log('[auth] post-login navigation complete', {
        url: this.router.url,
      });
    } catch {
      this.toast.dismiss(signingInId);
      this.toast.show(
        'error',
        this.authStore.errorMessage() ??
          'Could not sign in. Check your details and try again.',
        8000,
      );
    } finally {
      this.submitLocked = false;
    }
  }
}
