import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AuthStore } from '@ramsoft-builder/auth/data-access/auth';
import { UserProfileRepository } from '@ramsoft-builder/e-invoices/data-access/einvoice';
import {
  GSTR1_GSTZEN_AUTH_CONFIG,
  type EnsureGstnPortalSessionResult,
  type Gstr1GstzenAuthEnvironment,
  Gstr1AuthError,
  Gstr1GstnSessionEnsureService,
} from '@ramsoft-builder/gstr1/data-access/gstzen-auth';
import { catchError, firstValueFrom, of, switchMap } from 'rxjs';
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

type RefreshEnvelope =
  | { readonly kind: 'ok'; readonly result: EnsureGstnPortalSessionResult }
  | { readonly kind: 'error'; readonly payload: unknown };

@Component({
  selector: 'lib-gstr1-gstn-refresh-session-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './gstr1-gstn-refresh-session.modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Gstr1GstnRefreshSessionModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly ensure = inject(Gstr1GstnSessionEnsureService);
  private readonly destroyRef = inject(DestroyRef);
  readonly gstr1Zen = inject<Gstr1GstzenAuthEnvironment>(GSTR1_GSTZEN_AUTH_CONFIG);
  private readonly authStore = inject(AuthStore);
  private readonly userProfile = inject(UserProfileRepository);

  readonly closed = output<void>();

  readonly requestExamplePayload = JSON.stringify({ gstin: '36AAYCA9563F1ZZ' }, null, 2);

  readonly form = this.fb.nonNullable.group({
    gstin: ['', [Validators.required, indianGstinValidator]],
  });

  readonly loading = signal(false);
  readonly envelope = signal<RefreshEnvelope | null>(null);

  readonly showSuccessPanel = computed(() => this.envelope()?.kind === 'ok');

  readonly showErrorPanel = computed(() => this.envelope()?.kind === 'error');

  readonly result = computed(() => {
    const e = this.envelope();
    return e?.kind === 'ok' ? e.result : null;
  });

  readonly summaryHeading = computed(() => {
    const r = this.result();
    if (!r) {
      return '';
    }
    switch (r.kind) {
      case 'already_active':
        return 'Session already active';
      case 'refreshed':
        return 'Session refreshed';
      case 'invalid_gstin':
        return 'GSTIN not linked';
      case 'ambiguous_no_refresh':
        return 'Session status unclear';
      default: {
        const _exhaustive: never = r;
        return _exhaustive;
      }
    }
  });

  readonly summarySupportingText = computed(() => {
    const r = this.result();
    if (!r) {
      return '';
    }
    const msg =
      typeof r.checkResponse.message === 'string' ? r.checkResponse.message.trim() : '';
    switch (r.kind) {
      case 'already_active':
        return msg || 'No refresh was needed; GST portal session is active for this GSTIN.';
      case 'refreshed':
        return msg
          ? `Check session reported inactive/expired, then refresh completed. (${msg})`
          : 'Check session reported inactive/expired; refresh-session API was called.';
      case 'invalid_gstin':
        return msg || 'This GSTIN is not valid for your GSTZen account; refresh was not attempted.';
      case 'ambiguous_no_refresh':
        return (
          msg ||
          'Could not classify session from the check-session message. Refresh was not auto-triggered; verify with check session or OTP flow.'
        );
      default: {
        const _exhaustive: never = r;
        return _exhaustive;
      }
    }
  });

  readonly summaryTone = computed((): 'emerald' | 'amber' | 'rose' | 'slate' => {
    const r = this.result();
    if (!r) {
      return 'slate';
    }
    switch (r.kind) {
      case 'already_active':
        return 'emerald';
      case 'refreshed':
        return 'emerald';
      case 'invalid_gstin':
        return 'rose';
      case 'ambiguous_no_refresh':
        return 'amber';
      default: {
        const _exhaustive: never = r;
        return _exhaustive;
      }
    }
  });

  readonly combinedResponseJson = computed(() => {
    const r = this.result();
    if (!r) {
      return '';
    }
    try {
      const payload =
        r.kind === 'refreshed'
          ? { checkSession: r.checkResponse, refreshSession: r.refreshResponse }
          : { checkSession: r.checkResponse, refreshSession: null };
      return JSON.stringify(payload, null, 2);
    } catch {
      return `"${String(r)}"`;
    }
  });

  readonly errorPreviewJson = computed(() => {
    const e = this.envelope();
    if (!e || e.kind !== 'error') {
      return '';
    }
    try {
      return JSON.stringify(e.payload, null, 2);
    } catch {
      return `"${String(e.payload)}"`;
    }
  });

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
        if (gstin && !this.form.controls.gstin.getRawValue()?.trim()) {
          this.form.patchValue({ gstin: gstin.toUpperCase() }, { emitEvent: false });
        }
      });

    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.envelope.set(null);
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.loading()) {
      this.closed.emit();
    }
  }

  dismiss(): void {
    if (!this.loading()) {
      this.closed.emit();
    }
  }

  async submit(): Promise<void> {
    if (this.loading() || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { gstin } = this.form.getRawValue();
    this.loading.set(true);
    this.envelope.set(null);

    try {
      const result = await firstValueFrom(this.ensure.ensureGstnPortalSession(gstin));
      this.envelope.set({ kind: 'ok', result });
      console.info('[gstr1] gstn ensure session', {
        gstin: gstin.trim().toUpperCase(),
        kind: result.kind,
      });
    } catch (err: unknown) {
      this.envelope.set({
        kind: 'error',
        payload: this.normalizeErrorEnvelope(err),
      });
      console.error('[gstr1] gstn ensure session failed', err);
    } finally {
      this.loading.set(false);
    }
  }

  private normalizeErrorEnvelope(err: unknown): unknown {
    if (err instanceof Gstr1AuthError) {
      return {
        message: err.message,
        body: err.body ?? null,
      };
    }
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
}
