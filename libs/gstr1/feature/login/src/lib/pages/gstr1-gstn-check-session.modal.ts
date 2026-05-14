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
  type Gstr1GstzenAuthEnvironment,
  Gstr1GstnOtpApiService,
  deriveGstnCheckSessionUiOutcome,
  isGstnCheckSessionSuccessResponse,
  type GstnCheckSessionSuccessResponse,
  type GstnCheckSessionUiOutcome,
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

type CheckSessionEnvelope =
  | {
      readonly kind: 'ok';
      readonly outcome: GstnCheckSessionUiOutcome;
      readonly apiMessage: string;
      readonly raw: GstnCheckSessionSuccessResponse;
    }
  | { readonly kind: 'error'; readonly payload: unknown };

@Component({
  selector: 'lib-gstr1-gstn-check-session-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './gstr1-gstn-check-session.modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Gstr1GstnCheckSessionModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly gstnApi = inject(Gstr1GstnOtpApiService);
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
  readonly envelope = signal<CheckSessionEnvelope | null>(null);

  readonly showSuccessPanel = computed(() => this.envelope()?.kind === 'ok');

  readonly showErrorPanel = computed(() => this.envelope()?.kind === 'error');

  readonly outcome = computed(() => {
    const e = this.envelope();
    return e?.kind === 'ok' ? e.outcome : null;
  });

  readonly responsePreviewJson = computed(() => {
    const e = this.envelope();
    if (!e || e.kind !== 'ok') {
      return '';
    }
    try {
      return JSON.stringify(e.raw, null, 2);
    } catch {
      return `"${String(e.raw)}"`;
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

  readonly statusHeading = computed(() => {
    const o = this.outcome();
    if (!o) {
      return '';
    }
    switch (o) {
      case 'active_session':
        return 'Active Session';
      case 'session_expired':
        return 'Session Expired';
      case 'invalid_gstin':
        return 'Invalid GSTIN';
      default:
        return 'Session status';
    }
  });

  readonly statusSupportingText = computed(() => {
    const e = this.envelope();
    if (!e || e.kind !== 'ok') {
      return '';
    }
    if (e.outcome === 'ambiguous') {
      return (
        e.apiMessage ||
        'The API responded in an unexpected format. See the raw response below.'
      );
    }
    return e.apiMessage || '';
  });

  readonly statusPanelTone = computed(
    (): 'emerald' | 'amber' | 'rose' | 'slate' => {
      const o = this.outcome();
      switch (o) {
        case 'active_session':
          return 'emerald';
        case 'session_expired':
          return 'amber';
        case 'invalid_gstin':
          return 'rose';
        default:
          return 'slate';
      }
    },
  );

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
      const rawUnknown = await firstValueFrom(
        this.gstnApi.checkGstinSession({ gstin }),
      );
      if (!isGstnCheckSessionSuccessResponse(rawUnknown)) {
        this.envelope.set({
          kind: 'error',
          payload: {
            message: 'Unexpected response from gstn-check-session.',
            body: rawUnknown,
          },
        });
        return;
      }
      const raw = rawUnknown;
      const outcome = deriveGstnCheckSessionUiOutcome(raw);
      const apiMessage = typeof raw.message === 'string' ? raw.message.trim() : '';
      this.envelope.set({ kind: 'ok', outcome, apiMessage, raw });
    } catch (err: unknown) {
      this.envelope.set({
        kind: 'error',
        payload: this.normalizeErrorEnvelope(err),
      });
    } finally {
      this.loading.set(false);
    }
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
}
