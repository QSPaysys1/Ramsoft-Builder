import { isPlatformBrowser, JsonPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthStore } from '@ramsoft-builder/auth/data-access/auth';
import { UserProfileRepository } from '@ramsoft-builder/e-invoices/data-access/einvoice';
import {
  Gstr1GstnOtpApiService,
  gstr3bAutoliabLogicalError,
  gstr3bDueDateFromRetPeriod,
  gstr3bFormatAmount,
  parseGstr3bAutoliabBundle,
  RETURN_PERIOD_REGEX,
  type Gstr3bAutoliabBundle,
  type Gstr3bExemptAmounts,
  type Gstr3bInterStateAmounts,
  type Gstr3bPaymentAmounts,
  type Gstr3bTaxAmounts,
} from '@ramsoft-builder/gstr1/data-access/gstzen-auth';
import { catchError, firstValueFrom, of, switchMap } from 'rxjs';
import {
  indianFyLabelFromMmYyyy,
  monthNameFromMmYyyy,
  pickProfileString,
} from '../utils/gstr2a-period-labels';

type ViewState = 'idle' | 'loading' | 'success' | 'error';

function normalizeErrorEnvelope(err: unknown): unknown {
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

@Component({
  selector: 'lib-gstr3b-view-page',
  standalone: true,
  imports: [JsonPipe, RouterLink],
  templateUrl: './gstr3b-view.page.html',
  styleUrl: './gstr3b-view.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-[60vh]' },
})
export class Gstr3bViewPageComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(Gstr1GstnOtpApiService);
  private readonly authStore = inject(AuthStore);
  private readonly userProfile = inject(UserProfileRepository);

  readonly gstin = signal('');
  readonly retPeriod = signal('');
  readonly filingLabel = signal('');
  readonly legalName = signal('');

  readonly bundle = signal<Gstr3bAutoliabBundle | null>(null);
  readonly viewState = signal<ViewState>('idle');
  readonly logicalError = signal<string | null>(null);
  readonly httpError = signal<unknown>(null);

  readonly fyLabel = computed(() => indianFyLabelFromMmYyyy(this.retPeriod()));
  readonly taxPeriodLabel = computed(() => monthNameFromMmYyyy(this.retPeriod()));
  readonly dueDateLabel = computed(() => gstr3bDueDateFromRetPeriod(this.retPeriod()));

  readonly paramsValid = computed(() => {
    const g = this.gstin().trim();
    const r = this.retPeriod().trim();
    return g.length === 15 && RETURN_PERIOD_REGEX.test(r);
  });

  readonly backToDashboardQueryParams = computed(() => ({
    gstin: this.gstin().trim().toUpperCase(),
    ret_period: this.retPeriod().trim(),
    filing_status: this.filingLabel().trim() || undefined,
  }));

  readonly table31 = computed(() => this.bundle()?.table31 ?? this.zeroTax());
  readonly table311 = computed(() => this.bundle()?.table311 ?? this.zeroTax());
  readonly table32 = computed(() => this.bundle()?.table32 ?? this.zeroInter());
  readonly table4 = computed(() => this.bundle()?.table4 ?? this.zeroTax());
  readonly table5 = computed(() => this.bundle()?.table5 ?? this.zeroExempt());
  readonly table51 = computed(() => this.bundle()?.table51 ?? this.zeroTax());
  readonly table61 = computed(() => this.bundle()?.table61 ?? this.zeroPayment());

  readonly showInterestAlert = computed(() => {
    const t = this.table51();
    return (
      Number.parseFloat(t.igst) === 0 &&
      Number.parseFloat(t.cgst) === 0 &&
      Number.parseFloat(t.sgst) === 0 &&
      Number.parseFloat(t.cess) === 0
    );
  });

  constructor() {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((q) => {
        const g = (q.get('gstin') ?? '').trim().toUpperCase();
        const r = (q.get('ret_period') ?? '').trim();
        const fl = (q.get('filing_status') ?? '').trim();
        if (g) {
          this.gstin.set(g);
        }
        if (r) {
          this.retPeriod.set(r);
        }
        if (fl) {
          this.filingLabel.set(fl);
        }
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
        this.legalName.set(
          pickProfileString(p, [
            'legal_name',
            'legalName',
            'LegalName',
            'companyName',
            'CompanyName',
            'name',
          ]),
        );
      });

    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) {
        return;
      }
      void this.loadGstr3b();
    });
  }

  formatAmt(value: string): string {
    return gstr3bFormatAmount(value);
  }

  taxField(t: Gstr3bTaxAmounts, field: keyof Gstr3bTaxAmounts): string {
    return this.formatAmt(t[field]);
  }

  interField(t: Gstr3bInterStateAmounts, field: keyof Gstr3bInterStateAmounts): string {
    return this.formatAmt(t[field]);
  }

  exemptField(t: Gstr3bExemptAmounts, field: keyof Gstr3bExemptAmounts): string {
    return this.formatAmt(t[field]);
  }

  paymentField(t: Gstr3bPaymentAmounts, field: keyof Gstr3bPaymentAmounts): string {
    return this.formatAmt(t[field]);
  }

  openGstHelp(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    window.open('https://www.gst.gov.in/', '_blank', 'noopener,noreferrer');
  }

  async loadGstr3b(): Promise<void> {
    if (!this.paramsValid() || this.viewState() === 'loading') {
      return;
    }
    const gstin = this.gstin().trim().toUpperCase();
    const ret_period = this.retPeriod().trim();

    this.viewState.set('loading');
    this.logicalError.set(null);
    this.httpError.set(null);
    this.bundle.set(null);

    try {
      const payload = await firstValueFrom(
        this.api.fetchGstr3bAutoliab({ gstin, ret_period }),
      );
      const topErr = gstr3bAutoliabLogicalError(payload);
      if (topErr) {
        this.logicalError.set(topErr);
        this.viewState.set('error');
        return;
      }
      const parsed = parseGstr3bAutoliabBundle(payload);
      if (!parsed) {
        this.logicalError.set('Unexpected response from GSTR-3B auto-liability.');
        this.viewState.set('error');
        return;
      }
      this.bundle.set(parsed);
      this.viewState.set('success');
    } catch (err: unknown) {
      this.httpError.set(normalizeErrorEnvelope(err));
      this.viewState.set('error');
    }
  }

  private zeroTax(): Gstr3bTaxAmounts {
    return { igst: '0.00', cgst: '0.00', sgst: '0.00', cess: '0.00' };
  }

  private zeroInter(): Gstr3bInterStateAmounts {
    return { taxableValue: '0.00', igst: '0.00' };
  }

  private zeroExempt(): Gstr3bExemptAmounts {
    return { interState: '0.00', intraState: '0.00' };
  }

  private zeroPayment(): Gstr3bPaymentAmounts {
    return {
      balanceLiability: '0.00',
      paidThroughCash: '0.00',
      paidThroughCredit: '0.00',
    };
  }
}
