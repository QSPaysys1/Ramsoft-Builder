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
import { AuthStore } from '@ramsoft-builder/auth/data-access/auth';
import { UserProfileRepository } from '@ramsoft-builder/e-invoices/data-access/einvoice';
import {
  GSTR1_GSTZEN_AUTH_CONFIG,
  Gstr1GstnOtpApiService,
} from '@ramsoft-builder/gstr1/data-access/gstzen-auth';
import { indianGstinValidator } from '../validators/indian-gstin.validator';
import { catchError, firstValueFrom, of, switchMap } from 'rxjs';

const RETURN_PERIOD_REGEX = /^(0[1-9]|1[0-2])\d{4}$/;
const REFERENCE_UUID_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

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
  selector: 'lib-gstr1-gstn-return-status-page',
  standalone: true,
  imports: [NgClass, ReactiveFormsModule, RouterLink],
  templateUrl: './gstr1-gstn-return-status.page.html',
  host: {
    class: 'block min-h-[60vh] bg-blue-50 px-4 py-8 md:px-8',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Gstr1GstnReturnStatusPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly gstnApi = inject(Gstr1GstnOtpApiService);
  private readonly destroyRef = inject(DestroyRef);
  readonly gstr1Zen = inject(GSTR1_GSTZEN_AUTH_CONFIG);
  private readonly authStore = inject(AuthStore);
  private readonly userProfile = inject(UserProfileRepository);

  readonly requestExamplePayload = JSON.stringify(
    {
      ret_period: 'MMYYYY',
      gstin: '29ABCDE1234F1Z5',
      reference_id: '00a09d5b-0fcf-474a-abac-f0eaa34284de',
    },
    null,
    2,
  );

  readonly form = this.fb.nonNullable.group({
    retPeriod: [
      '',
      [Validators.required, Validators.pattern(RETURN_PERIOD_REGEX)],
    ],
    gstin: ['', [Validators.required, indianGstinValidator]],
    referenceId: [
      '',
      [Validators.required, Validators.pattern(REFERENCE_UUID_REGEX)],
    ],
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
          this.form.patchValue(
            { gstin: gstin.toUpperCase() },
            { emitEvent: false },
          );
        }
      });

    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.envelope.set(null);
    });
  }

  readonly liveRequestJson = computed(() => {
    const { retPeriod, gstin, referenceId } = this.form.getRawValue();
    const g = gstin?.trim().toUpperCase() ?? '';
    const r = retPeriod?.trim() ?? '';
    const ref = referenceId?.trim() ?? '';
    return JSON.stringify(
      {
        ret_period:
          RETURN_PERIOD_REGEX.test(r) ? r : '{{RETURN_PERIOD}}',
        gstin: g.length === 15 ? g : '{{GSTIN}}',
        reference_id: REFERENCE_UUID_REGEX.test(ref)
          ? ref
          : '{{REFERENCE_ID}}',
      },
      null,
      2,
    );
  });

  async submit(): Promise<void> {
    if (this.loading() || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { retPeriod, gstin, referenceId } = this.form.getRawValue();
    this.loading.set(true);
    this.envelope.set(null);

    try {
      const payload = await firstValueFrom(
        this.gstnApi.getReturnStatus({
          ret_period: retPeriod,
          gstin,
          reference_id: referenceId,
        }),
      );
      this.envelope.set({ ok: true, payload });
    } catch (err: unknown) {
      this.envelope.set({
        ok: false,
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
