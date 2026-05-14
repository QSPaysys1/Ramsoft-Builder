import { NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { AppUser } from '@ramsoft-builder/auth/data-access/auth';
import { AuthStore } from '@ramsoft-builder/auth/data-access/auth';
import { UserProfileRepository } from '@ramsoft-builder/e-invoices/data-access/einvoice';
import {
  GSTR1_GSTZEN_AUTH_CONFIG,
  Gstr1GstnOtpApiService,
} from '@ramsoft-builder/gstr1/data-access/gstzen-auth';
import { indianGstinValidator } from '../validators/indian-gstin.validator';
import { catchError, firstValueFrom, of, switchMap } from 'rxjs';

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

@Component({
  selector: 'lib-gstr1-gstn-generate-otp-page',
  standalone: true,
  imports: [NgClass, ReactiveFormsModule, RouterLink],
  templateUrl: './gstr1-gstn-generate-otp.page.html',
  host: {
    class: 'block min-h-[60vh] bg-blue-50 px-4 py-8 md:px-8',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Gstr1GstnGenerateOtpPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly gstnApi = inject(Gstr1GstnOtpApiService);
  private readonly destroyRef = inject(DestroyRef);
  /** For displaying the configured POST URL / wiring examples. */
  readonly gstr1Zen = inject(GSTR1_GSTZEN_AUTH_CONFIG);
  private readonly authStore = inject(AuthStore);
  private readonly userProfile = inject(UserProfileRepository);

  readonly requestExamplePayload = JSON.stringify(
    {
      gstin: 'GSTIN in your account',
      username: 'gst_portal_username',
    },
    null,
    2,
  );

  /** Live JSON for Establish Session; placeholders match docs when fields are empty. */
  readonly establishSessionPayloadJson = signal('');

  readonly copiedEstablishPayload = signal(false);

  private readonly establishEnvelope = signal<{
    readonly ok: boolean;
    readonly payload: unknown;
  } | null>(null);

  readonly establishSessionLoading = signal(false);

  readonly hasEstablishResponse = computed(() => this.establishEnvelope() !== null);
  readonly establishResponseOk = computed(() => this.establishEnvelope()?.ok ?? false);
  readonly establishResponsePreviewJson = computed(() => {
    const e = this.establishEnvelope();
    if (!e) {
      return '';
    }
    try {
      return JSON.stringify(e.payload, null, 2);
    } catch {
      return `"${String(e.payload)}"`;
    }
  });

  readonly gstnOtpForm = this.fb.nonNullable.group({
    gstin: ['', [Validators.required, indianGstinValidator]],
    gstPortalUsername: ['', [Validators.required, Validators.maxLength(256)]],
  });

  /** Payload for `POST gstn-establish-session/` — enter the OTP received on the GST portal. */
  readonly establishSessionForm = this.fb.nonNullable.group({
    gstin: ['', [Validators.required, indianGstinValidator]],
    otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  private readonly envelope = signal<{
    readonly ok: boolean;
    readonly payload: unknown;
  } | null>(null);

  readonly loading = signal(false);

  readonly hasResponse = computed(() => this.envelope() !== null);
  readonly responseOk = computed(() => this.envelope()?.ok ?? false);
  readonly responsePreviewJson = computed(() => {
    const e = this.envelope();
    if (!e) {
      return '';
    }
    try {
      return JSON.stringify(e.payload, null, 2);
    } catch {
      return `"${String(e.payload)}"`;
    }
  });

  readonly appUserEmail = computed(() => this.authStore.user()?.email?.trim() ?? '');

  constructor() {
    toObservable(this.authStore.user)
      .pipe(
        switchMap((user) => {
          this.prefillPortalUsernameFromAppUser(user ?? null);
          if (!user?.id) {
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
        if (gstin && !this.gstnOtpForm.controls.gstin.getRawValue()?.trim()) {
          this.gstnOtpForm.patchValue(
            { gstin: gstin.toUpperCase() },
            { emitEvent: false },
          );
        }
        const portalFromProfile = pickProfileString(p, [
          'gstPortalUsername',
          'gst_portal_username',
          'GstPortalUsername',
          'gstUserName',
          'gst_username',
        ]);
        if (portalFromProfile) {
          this.gstnOtpForm.patchValue(
            { gstPortalUsername: portalFromProfile },
            { emitEvent: false },
          );
        }
      });

    this.gstnOtpForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.envelope.set(null);
        this.updateEstablishSessionPayloadJson();
      });

    this.establishSessionForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.establishEnvelope.set(null);
        this.updateEstablishSessionPayloadJson();
      });
  }

  async submit(): Promise<void> {
    if (this.loading() || this.gstnOtpForm.invalid) {
      this.gstnOtpForm.markAllAsTouched();
      return;
    }

    const { gstin, gstPortalUsername } = this.gstnOtpForm.getRawValue();
    this.loading.set(true);
    this.envelope.set(null);
    this.establishEnvelope.set(null);

    try {
      const payload = await firstValueFrom(
        this.gstnApi.generateOtp({
          gstin,
          username: gstPortalUsername,
        }),
      );
      this.envelope.set({ ok: true, payload });
      const g = this.gstnOtpForm.getRawValue().gstin.trim().toUpperCase();
      this.establishSessionForm.patchValue(
        { gstin: g, otp: '' },
        { emitEvent: true },
      );
      this.establishSessionForm.markAsUntouched();
      this.updateEstablishSessionPayloadJson();
    } catch (err: unknown) {
      this.envelope.set({
        ok: false,
        payload: this.normalizeErrorEnvelope(err),
      });
    } finally {
      this.loading.set(false);
    }
  }

  async submitEstablishSession(): Promise<void> {
    if (
      this.establishSessionLoading() ||
      !this.responseOk() ||
      this.establishSessionForm.invalid
    ) {
      this.establishSessionForm.markAllAsTouched();
      return;
    }

    const { gstin, otp } = this.establishSessionForm.getRawValue();
    this.establishSessionLoading.set(true);
    this.establishEnvelope.set(null);
    try {
      const payload = await firstValueFrom(
        this.gstnApi.establishSession({ gstin, otp }),
      );
      this.establishEnvelope.set({ ok: true, payload });
    } catch (err: unknown) {
      this.establishEnvelope.set({
        ok: false,
        payload: this.normalizeErrorEnvelope(err),
      });
    } finally {
      this.establishSessionLoading.set(false);
    }
  }

  async copyEstablishSessionPayload(): Promise<void> {
    const text = this.establishSessionPayloadJson();
    if (!text) {
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      this.copiedEstablishPayload.set(true);
      setTimeout(() => this.copiedEstablishPayload.set(false), 2000);
    } catch {
      this.copiedEstablishPayload.set(false);
    }
  }

  private updateEstablishSessionPayloadJson(): void {
    if (!this.responseOk()) {
      this.establishSessionPayloadJson.set('');
      return;
    }
    const { gstin, otp } = this.establishSessionForm.getRawValue();
    const g = gstin?.trim().toUpperCase() ?? '';
    const o = otp?.trim() ?? '';
    const otpOut = /^\d{6}$/.test(o) ? o : '123456';
    this.establishSessionPayloadJson.set(
      JSON.stringify(
        {
          gstin: g || 'GSTIN in your account',
          otp: otpOut,
        },
        null,
        2,
      ),
    );
  }

  private normalizeErrorEnvelope(err: unknown): unknown {
    if (err instanceof HttpErrorResponse) {
      const bodyUnknown = err.error;
      let parsedBody = bodyUnknown;
      if (typeof bodyUnknown === 'string') {
        try {
          parsedBody = JSON.parse(bodyUnknown) as unknown;
        } catch {
          parsedBody = bodyUnknown;
        }
      }
      return {
        httpStatus: err.status,
        statusText: err.statusText,
        url: err.url ?? null,
        body: parsedBody,
      };
    }
    if (err instanceof Error) {
      return { message: err.message };
    }
    return { message: String(err) };
  }

  private prefillPortalUsernameFromAppUser(user: AppUser | null): void {
    const email = user?.email?.trim();
    if (!email) {
      return;
    }
    const cur = this.gstnOtpForm.controls.gstPortalUsername.getRawValue()?.trim();
    if (!cur) {
      this.gstnOtpForm.patchValue(
        { gstPortalUsername: email },
        { emitEvent: false },
      );
    }
  }
}
