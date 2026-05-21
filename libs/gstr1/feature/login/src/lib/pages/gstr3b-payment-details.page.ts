import { DecimalPipe, isPlatformBrowser, JsonPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  buildGstr3bPaymentGrid,
  buildGstr3bRetsavePayload,
  creditLedgerFromItcAvl,
  emptyGstr3bRetsaveFormState,
  emptyGstr3bTxPmt,
  findGstr3bPdcashByTyp,
  GSTR3B_TX_PMT_NON_RC,
  GSTR3B_TX_PMT_RC,
  Gstr1GstnOtpApiService,
  gstr3bAutoliabLogicalError,
  gstr3bHasPendingTaxLiability,
  gstr3bRetsaveLogicalError,
  gstr3bRetsumLogicalError,
  normalizeGstr3bPdcash,
  parseGstr3bRetsaveFromAutoliab,
  parseGstr3bRetsaveFromRetsum,
  RETURN_PERIOD_REGEX,
  sumGstr3bTxPmtCash,
  sumGstr3bTxPmtCredit,
  withComputedItcNet,
  type Gstr3bRetsaveFormState,
  type Gstr3bTxPmt,
} from '@ramsoft-builder/gstr1/data-access/gstzen-auth';
import { firstValueFrom } from 'rxjs';

type ViewState = 'idle' | 'loading' | 'ready' | 'error';

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
  selector: 'lib-gstr3b-payment-details-page',
  standalone: true,
  imports: [DecimalPipe, JsonPipe, RouterLink, FormsModule],
  templateUrl: './gstr3b-payment-details.page.html',
  styleUrl: './gstr3b-sup-details.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-[60vh]' },
})
export class Gstr3bPaymentDetailsPageComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(Gstr1GstnOtpApiService);

  readonly gstin = signal('');
  readonly retPeriod = signal('');
  readonly filingLabel = signal('');

  readonly viewState = signal<ViewState>('idle');
  readonly logicalError = signal<string | null>(null);
  readonly httpError = signal<unknown>(null);

  readonly retsaveForm = signal<Gstr3bRetsaveFormState>(emptyGstr3bRetsaveFormState());
  readonly draftTxPmt = signal<Gstr3bTxPmt>(emptyGstr3bTxPmt());

  readonly retsaveSubmitting = signal(false);
  readonly retsaveError = signal<unknown>(null);
  readonly retsaveSuccessPayload = signal<unknown>(null);

  readonly paramsValid = computed(() => {
    const g = this.gstin().trim();
    const r = this.retPeriod().trim();
    return g.length === 15 && RETURN_PERIOD_REGEX.test(r);
  });

  readonly backToGstr3bQueryParams = computed(() => ({
    gstin: this.gstin().trim().toUpperCase(),
    ret_period: this.retPeriod().trim(),
    filing_status: this.filingLabel().trim() || undefined,
  }));

  readonly retsavePreview = computed(() =>
    buildGstr3bRetsavePayload(this.gstin(), this.retPeriod(), this.retsaveForm()),
  );

  readonly paymentGrid = computed(() => buildGstr3bPaymentGrid(this.draftTxPmt()));

  readonly creditLedger = computed(() =>
    creditLedgerFromItcAvl(this.retsaveForm().itc_elg),
  );

  readonly hasPendingLiability = computed(() => gstr3bHasPendingTaxLiability(this.draftTxPmt()));

  readonly paidThroughCredit = computed(() => sumGstr3bTxPmtCredit(this.draftTxPmt().pditc));
  readonly paidThroughCash = computed(() => sumGstr3bTxPmtCash(this.draftTxPmt()));

  readonly cashNonRc = computed(() =>
    findGstr3bPdcashByTyp(this.draftTxPmt().pdcash, GSTR3B_TX_PMT_NON_RC),
  );

  readonly cashRc = computed(() =>
    findGstr3bPdcashByTyp(this.draftTxPmt().pdcash, GSTR3B_TX_PMT_RC),
  );

  readonly creditTotal = computed(() => {
    const c = this.creditLedger();
    return c.igst + c.cgst + c.sgst + c.cess;
  });

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((q) => {
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
      if (isPlatformBrowser(this.platformId) && g.length === 15 && RETURN_PERIOD_REGEX.test(r)) {
        void this.loadDetails();
      }
    });
  }

  touchTxPmt(): void {
    const draft = structuredClone(this.draftTxPmt());
    draft.pdcash = normalizeGstr3bPdcash(draft.pdcash);
    this.draftTxPmt.set(draft);
    this.retsaveForm.update((form) =>
      withComputedItcNet({
        ...form,
        tx_pmt: draft,
      }),
    );
  }

  cancel(): void {
    this.draftTxPmt.set(structuredClone(this.retsaveForm().tx_pmt));
    this.retsaveError.set(null);
    this.retsaveSuccessPayload.set(null);
  }

  async loadDetails(): Promise<void> {
    if (!this.paramsValid()) {
      return;
    }
    if (this.viewState() === 'loading') {
      return;
    }
    const gstin = this.gstin().trim().toUpperCase();
    const ret_period = this.retPeriod().trim();

    this.viewState.set('loading');
    this.logicalError.set(null);
    this.httpError.set(null);
    this.retsaveError.set(null);
    this.retsaveSuccessPayload.set(null);

    try {
      const retsumPayload = await firstValueFrom(
        this.api.fetchGstr3bRetsum({ gstin, ret_period }),
      );
      const retsumErr = gstr3bRetsumLogicalError(retsumPayload);
      if (!retsumErr) {
        const form = parseGstr3bRetsaveFromRetsum(retsumPayload);
        if (form) {
          this.retsaveForm.set(form);
          this.draftTxPmt.set(structuredClone(form.tx_pmt));
          this.viewState.set('ready');
          return;
        }
      }

      const autoliabPayload = await firstValueFrom(
        this.api.fetchGstr3bAutoliab({ gstin, ret_period }),
      );
      const autoliabErr = gstr3bAutoliabLogicalError(autoliabPayload);
      if (autoliabErr) {
        this.logicalError.set(retsumErr ?? autoliabErr);
        this.viewState.set('error');
        return;
      }
      const form = parseGstr3bRetsaveFromAutoliab(autoliabPayload);
      this.retsaveForm.set(form);
      this.draftTxPmt.set(structuredClone(form.tx_pmt));
      this.viewState.set('ready');
    } catch (err: unknown) {
      this.httpError.set(normalizeErrorEnvelope(err));
      this.viewState.set('error');
    }
  }

  async confirm(): Promise<void> {
    if (!this.paramsValid() || this.retsaveSubmitting()) {
      return;
    }

    this.touchTxPmt();
    const body = buildGstr3bRetsavePayload(
      this.gstin(),
      this.retPeriod(),
      this.retsaveForm(),
    );

    this.retsaveSubmitting.set(true);
    this.retsaveError.set(null);
    this.retsaveSuccessPayload.set(null);

    try {
      const res = await firstValueFrom(this.api.retsaveGstr3bReturn(body));
      const err = gstr3bRetsaveLogicalError(res);
      if (err) {
        this.retsaveError.set({ message: err, body: res });
        return;
      }
      this.retsaveSuccessPayload.set(res);
      await this.loadDetails();
    } catch (err: unknown) {
      this.retsaveError.set(normalizeErrorEnvelope(err));
    } finally {
      this.retsaveSubmitting.set(false);
    }
  }
}
