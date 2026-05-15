import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
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
  type AppUser,
} from '@ramsoft-builder/auth/data-access/auth';
import {
  AuthPageLayoutComponent,
  AuthPasswordFieldComponent,
  AuthServerErrorComponent,
  AuthSubmitButtonComponent,
  AuthToastService,
  AuthUserNameFieldComponent,
} from '@ramsoft-builder/auth/ui/login';
import { UserProfileRepository } from '@ramsoft-builder/e-invoices/data-access/einvoice';
import { Gstr1AuthStore } from '@ramsoft-builder/gstr1/data-access/gstzen-auth';
import { catchError, debounceTime, of, switchMap } from 'rxjs';
import { indianGstinValidator } from '../validators/indian-gstin.validator';

function pickProfileString(
  obj: Record<string, unknown> | undefined,
  keys: string[],
): string {
  if (!obj) {
    return '';
  }
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim()) {
      return v.trim();
    }
  }
  return '';
}

/** Last-used GSTZen user name and password per GSTIN (this browser tab only; set after a successful sign-in). */
const LOGIN_DRAFT_STORAGE_KEY = 'ramsoft.gstr1.login.draftsByGstin';

type LoginDraftByGstin = Record<
  string,
  { readonly userName: string; readonly password: string }
>;

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
    AuthUserNameFieldComponent,
    AuthPasswordFieldComponent,
    AuthSubmitButtonComponent,
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
  private readonly toast = inject(AuthToastService);
  private readonly authStore = inject(AuthStore);
  private readonly userProfile = inject(UserProfileRepository);

  private readonly profileGstinRaw = signal('');

  private submitLocked = false;

  readonly heroImageSrc = 'assets/img/ramsoftmillersmelody.png';

  readonly loginForm = this.fb.nonNullable.group({
    gstin: ['', [Validators.required, indianGstinValidator]],
    userName: ['', [Validators.required]],
    password: [
      '',
      [Validators.required, Validators.minLength(1), Validators.maxLength(128)],
    ],
  });

  readonly loading = computed(() => this.gstr1Auth.status() === 'loading');

  /** GSTIN from Supabase profile `data`, same keys as dashboard home. */
  readonly profileGstinDisplay = computed(() => {
    const g = this.profileGstinRaw().trim();
    return g ? g.toUpperCase() : '';
  });

  readonly appUserEmail = computed(() => this.authStore.user()?.email?.trim() ?? '');

  constructor() {
    toObservable(this.authStore.user)
      .pipe(
        switchMap((user) => {
          this.prefillUserNameFromAppUser(user ?? null);
          if (!user?.id) {
            this.profileGstinRaw.set('');
            return of(undefined);
          }
          return this.userProfile.watchProfileData(user.id).pipe(
            catchError(() => of(undefined)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((prof) => {
        const p = prof as Record<string, unknown> | undefined;
        const gstin = pickProfileString(p, [
          'GSTIN',
          'gstin',
          'tinGstNo',
          'organizationGstin',
          'Gstin',
        ]);
        this.profileGstinRaw.set(gstin);
        const gstinCtrl = this.loginForm.controls.gstin;
        if (gstin && !gstinCtrl.getRawValue()?.trim()) {
          const g = gstin.toUpperCase();
          gstinCtrl.patchValue(g, { emitEvent: false });
          this.applyCredentialsForGstin(g);
        }
      });

    const gstinCtrl = this.loginForm.controls.gstin;
    gstinCtrl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => {
        const raw = (v ?? '').trim();
        const u = raw.toUpperCase();
        if (raw !== u) {
          gstinCtrl.patchValue(u, { emitEvent: false });
        }
      });

    gstinCtrl.valueChanges
      .pipe(debounceTime(400), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const g = (gstinCtrl.value ?? '').trim().toUpperCase();
        if (!g) {
          this.loginForm.patchValue(
            { userName: '', password: '' },
            { emitEvent: false },
          );
          return;
        }
        if (!gstinCtrl.valid) {
          return;
        }
        this.applyCredentialsForGstin(g);
      });

    this.loginForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.gstr1Auth.clearError());
  }

  private readLoginDrafts(): LoginDraftByGstin {
    if (!isPlatformBrowser(this.platformId) || !globalThis.sessionStorage) {
      return {};
    }
    try {
      const raw = globalThis.sessionStorage.getItem(LOGIN_DRAFT_STORAGE_KEY);
      if (!raw) {
        return {};
      }
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== 'object') {
        return {};
      }
      return parsed as LoginDraftByGstin;
    } catch {
      return {};
    }
  }

  private persistLoginDraft(
    gstinUpper: string,
    userName: string,
    password: string,
  ): void {
    if (!isPlatformBrowser(this.platformId) || !globalThis.sessionStorage) {
      return;
    }
    const g = gstinUpper.trim().toUpperCase();
    if (g.length !== 15) {
      return;
    }
    const next = {
      ...this.readLoginDrafts(),
      [g]: { userName, password },
    };
    globalThis.sessionStorage.setItem(
      LOGIN_DRAFT_STORAGE_KEY,
      JSON.stringify(next),
    );
  }

  private applyCredentialsForGstin(normalizedGstin: string): void {
    const g = normalizedGstin.trim().toUpperCase();
    if (g.length !== 15) {
      return;
    }
    const draft = this.readLoginDrafts()[g];
    if (draft) {
      this.loginForm.patchValue(
        { userName: draft.userName, password: draft.password },
        { emitEvent: false },
      );
      return;
    }
    const profileG = this.profileGstinRaw().trim().toUpperCase();
    if (g === profileG) {
      const email = this.authStore.user()?.email?.trim() ?? '';
      this.loginForm.patchValue(
        { userName: email, password: '' },
        { emitEvent: false },
      );
      return;
    }
    if (profileG) {
      this.loginForm.patchValue(
        { userName: '', password: '' },
        { emitEvent: false },
      );
      return;
    }
    const email = this.authStore.user()?.email?.trim() ?? '';
    const currentUser = this.loginForm.controls.userName.getRawValue()?.trim();
    if (email && !currentUser) {
      this.loginForm.patchValue({ userName: email }, { emitEvent: false });
    }
  }

  private prefillUserNameFromAppUser(user: AppUser | null): void {
    const email = user?.email?.trim();
    if (!email) {
      return;
    }
    const gstinVal =
      this.loginForm.controls.gstin.getRawValue()?.trim().toUpperCase() ?? '';
    const profileG = this.profileGstinRaw().trim().toUpperCase();
    if (gstinVal && profileG && gstinVal !== profileG) {
      return;
    }
    const current = this.loginForm.controls.userName.getRawValue()?.trim();
    if (!current) {
      this.loginForm.patchValue({ userName: email }, { emitEvent: false });
    }
  }

  async onSubmit(): Promise<void> {
    if (this.submitLocked) {
      return;
    }
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.toast.show(
        'error',
        'Please enter a valid GSTIN, GSTZen user name, and password.',
        6000,
      );
      return;
    }

    this.submitLocked = true;
    const { gstin, userName, password } = this.loginForm.getRawValue();
    this.toast.clear();
    const signingInId = this.toast.show('info', 'Signing in to GSTZen…', 0);
    try {
      await this.gstr1Auth.login(userName, password);
      this.persistLoginDraft(gstin, userName, password);
      this.toast.dismiss(signingInId);
      this.toast.show(
        'success',
        'GSTZen session established. Taking you to the app…',
        5000,
      );
      const fallback = '/home';
      const target = safeInternalNavigateUrl(
        this.route.snapshot.queryParamMap.get('returnUrl'),
        fallback,
      );
      if (isPlatformBrowser(this.platformId)) {
        await this.router.navigateByUrl(target, { replaceUrl: true });
      }
    } catch {
      this.toast.dismiss(signingInId);
      this.toast.show(
        'error',
        this.gstr1Auth.errorMessage() ??
          'Could not sign in to GSTZen. Check your credentials and try again.',
        8000,
      );
    } finally {
      this.submitLocked = false;
    }
  }
}
