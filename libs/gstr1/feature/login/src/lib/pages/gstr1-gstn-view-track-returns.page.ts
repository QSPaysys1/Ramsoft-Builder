import { isPlatformBrowser, NgClass } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
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
  OPTIONAL_RET_PERIOD_REGEX,
  RETURN_PERIOD_REGEX,
  cellFromRow,
  deriveFamilyStatus,
  filedListFromPayload,
  isGstr1IffFamily,
  isGstr3bFamily,
  lastFiveGstReturnPeriodLabels,
  type MonthReturnKind,
  rettrackCacheKey,
  topLevelPayloadError,
} from '@ramsoft-builder/gstr1/data-access/gstzen-auth';
import { indianGstinValidator } from '../validators/indian-gstin.validator';
import { catchError, firstValueFrom, of, switchMap } from 'rxjs';

interface GstinPeriodUiState {
  readonly loading: boolean;
  readonly gstr1Iff: MonthReturnKind;
  readonly gstr3b: MonthReturnKind;
  /** Set when HTTP fails or payload looks like an error envelope. */
  readonly note?: string;
}

interface CachedRettrackDerived {
  readonly gstr1Iff: Exclude<MonthReturnKind, 'idle'>;
  readonly gstr3b: Exclude<MonthReturnKind, 'idle'>;
}

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
  selector: 'lib-gstr1-gstn-view-track-returns-page',
  standalone: true,
  imports: [NgClass, ReactiveFormsModule, RouterLink],
  templateUrl: './gstr1-gstn-view-track-returns.page.html',
  host: {
    class: 'block min-h-[60vh] bg-blue-50 px-4 py-8 md:px-8',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Gstr1GstnViewTrackReturnsPageComponent {
  /** Postman-style Bearer variable label. */
  readonly authTokenPlaceholder = '{{AUTH_TOKEN}}';

  private readonly platformId = inject(PLATFORM_ID);
  private readonly fb = inject(FormBuilder);
  private readonly gstnApi = inject(Gstr1GstnOtpApiService);
  private readonly destroyRef = inject(DestroyRef);
  readonly gstr1Zen = inject(GSTR1_GSTZEN_AUTH_CONFIG);
  private readonly authStore = inject(AuthStore);
  private readonly userProfile = inject(UserProfileRepository);

  readonly requestExamplePayload = JSON.stringify(
    {
      ret_period: '042026',
      gstin: '36AAYCA9563F1ZZ',
    },
    null,
    2,
  );

  readonly form = this.fb.nonNullable.group({
    retPeriod: [
      '',
      [Validators.pattern(OPTIONAL_RET_PERIOD_REGEX)],
    ],
    gstin: ['', [Validators.required, indianGstinValidator]],
  });

  private readonly envelope = signal<{
    readonly ok: boolean;
    readonly payload: unknown;
  } | null>(null);

  readonly loading = signal(false);

  /** GSTIN whose last-five-month panel is open (set when user confirms the GSTIN tile). */
  readonly expandedGstinForPeriods = signal<string | null>(null);

  /** Per `gstin::retPeriod` UI + loading; successful derivations are also cached in memory to skip duplicate HTTP. */
  readonly periodUi = signal<Readonly<Record<string, GstinPeriodUiState>>>({});

  private readonly rettrackDerivedCache = new Map<string, CachedRettrackDerived>();
  private readonly rettrackInFlight = new Set<string>();

  readonly lastFiveReturnPeriods = signal(lastFiveGstReturnPeriodLabels());

  readonly hasResponse = computed(() => this.envelope() !== null);
  readonly responseOk = computed(() => this.envelope()?.ok ?? false);
  readonly filedRows = computed(() =>
    this.responseOk()
      ? filedListFromPayload(this.envelope()?.payload ?? null)
      : [],
  );
  readonly hasFiledTable = computed(() => this.filedRows().length > 0);

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
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) {
        return;
      }
      this.lastFiveReturnPeriods.set(lastFiveGstReturnPeriodLabels());
    });

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
      this.expandedGstinForPeriods.set(null);
      this.periodUi.set({});
      this.rettrackDerivedCache.clear();
      this.rettrackInFlight.clear();
      this.lastFiveReturnPeriods.set(lastFiveGstReturnPeriodLabels());
    });
  }

  readonly liveRequestJson = computed(() => {
    const { retPeriod, gstin } = this.form.getRawValue();
    const g = gstin?.trim().toUpperCase() ?? '';
    const r = retPeriod?.trim() ?? '';
    return JSON.stringify(
      {
        ret_period: RETURN_PERIOD_REGEX.test(r) ? r : '{{RET_PERIOD}}',
        gstin: g.length === 15 ? g : '{{GSTIN}}',
      },
      null,
      2,
    );
  });

  readonly idlePeriodUi: GstinPeriodUiState = Object.freeze({
    loading: false,
    gstr1Iff: 'idle',
    gstr3b: 'idle',
  });

  /** Product copy: logical payload; POST body sends `ret_period` (same value). */
  sampleUserShapeRettrack(gstin: string, retPeriod: string): string {
    return JSON.stringify(
      {
        gstin: gstin.trim().toUpperCase(),
        retPeriod,
      },
      null,
      2,
    );
  }

  periodUiFor(gstinUpper: string, retPeriod: string): GstinPeriodUiState {
    const k = rettrackCacheKey(gstinUpper, retPeriod);
    return this.periodUi()[k] ?? this.idlePeriodUi;
  }

  monthKindLabel(kind: MonthReturnKind): string {
    switch (kind) {
      case 'filed':
        return 'Filed';
      case 'notFiled':
        return 'Not filed';
      case 'pending':
        return 'Pending';
      case 'error':
        return 'Error';
      default:
        return 'Tap month';
    }
  }

  monthPillNgClass(
    kind: MonthReturnKind,
  ): Record<string, boolean> {
    return {
      'bg-emerald-600 text-white ring-1 ring-emerald-700/30': kind === 'filed',
      'bg-amber-500 text-white ring-1 ring-amber-700/30':
        kind === 'pending',
      'bg-rose-600 text-white ring-1 ring-rose-800/30': kind === 'notFiled',
      'bg-red-800 text-white ring-1 ring-red-950/30': kind === 'error',
      'bg-slate-200 text-slate-600': kind === 'idle',
    };
  }

  /** Opens the last-five-months panel for the GSTIN currently in the form (must be valid). */
  openReturnPeriodsForEnteredGstin(): void {
    const gstin = this.form.controls.gstin.getRawValue()?.trim();
    if (!gstin || this.form.controls.gstin.invalid) {
      this.form.controls.gstin.markAsTouched();
      return;
    }
    const g = gstin.toUpperCase();
    this.expandedGstinForPeriods.set(g);
    this.lastFiveReturnPeriods.set(lastFiveGstReturnPeriodLabels());
  }

  collapseReturnPeriodsPanel(): void {
    this.expandedGstinForPeriods.set(null);
  }

  async fetchReturnPeriodForMonth(
    gstinUpper: string,
    retPeriod: string,
  ): Promise<void> {
    const g = gstinUpper.trim().toUpperCase();
    const key = rettrackCacheKey(g, retPeriod);

    if (this.rettrackInFlight.has(key)) {
      return;
    }

    const cached = this.rettrackDerivedCache.get(key);
    if (cached) {
      this.patchPeriodState(key, {
        loading: false,
        gstr1Iff: cached.gstr1Iff,
        gstr3b: cached.gstr3b,
      });
      return;
    }

    this.rettrackInFlight.add(key);
    this.patchPeriodState(key, {
      loading: true,
      gstr1Iff: 'idle',
      gstr3b: 'idle',
    });

    try {
      const payload = await firstValueFrom(
        this.gstnApi.viewAndTrackReturns({
          gstin: g,
          ret_period: retPeriod,
        }),
      );
      const topErr = topLevelPayloadError(payload);
      if (topErr) {
        this.patchPeriodState(key, {
          loading: false,
          gstr1Iff: 'error',
          gstr3b: 'error',
          note: topErr,
        });
        return;
      }
      const rows = filedListFromPayload(payload);
      const g1 = deriveFamilyStatus(rows, retPeriod, g, isGstr1IffFamily);
      const b3 = deriveFamilyStatus(rows, retPeriod, g, isGstr3bFamily);
      this.rettrackDerivedCache.set(key, { gstr1Iff: g1, gstr3b: b3 });
      this.patchPeriodState(key, {
        loading: false,
        gstr1Iff: g1,
        gstr3b: b3,
      });
    } catch (err: unknown) {
      const note =
        err instanceof HttpErrorResponse
          ? `${err.status} ${err.statusText}`.trim()
          : err instanceof Error
            ? err.message
            : String(err);
      this.patchPeriodState(key, {
        loading: false,
        gstr1Iff: 'error',
        gstr3b: 'error',
        note,
      });
    } finally {
      this.rettrackInFlight.delete(key);
    }
  }

  private patchPeriodState(key: string, next: GstinPeriodUiState): void {
    this.periodUi.update((m) => ({ ...m, [key]: next }));
  }

  cell(row: Record<string, unknown>, ...keys: string[]): string {
    return cellFromRow(row, ...keys);
  }

  async submit(): Promise<void> {
    if (this.loading() || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { retPeriod, gstin } = this.form.getRawValue();
    const r = retPeriod?.trim() ?? '';
    if (!RETURN_PERIOD_REGEX.test(r)) {
      this.form.controls.retPeriod.markAsTouched();
      return;
    }

    this.loading.set(true);
    this.envelope.set(null);

    try {
      const payload = await firstValueFrom(
        this.gstnApi.viewAndTrackReturns({
          ret_period: r,
          gstin,
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
