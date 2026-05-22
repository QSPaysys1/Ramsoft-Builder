import { isPlatformBrowser, JsonPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  type AbstractControl,
  type ValidationErrors,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthStore } from '@ramsoft-builder/auth/data-access/auth';
import { UserProfileRepository } from '@ramsoft-builder/e-invoices/data-access/einvoice';
import {
  Gstr1GstnOtpApiService,
  GSTR1A_DOWNLOAD_API_OPTIONS,
  RETURN_PERIOD_REGEX,
  isGstr1DownloadSuccessEnvelope,
  type Gstr1aDownloadApiName,
} from '@ramsoft-builder/gstr1/data-access/gstzen-auth';
import { catchError, firstValueFrom, of, switchMap } from 'rxjs';
import {
  GSTR1_NIL_RESAVE_INV_ORDER,
  GSTR1_NIL_SUPPLY_ROWS,
} from './gstr1-nil-supplies.constants';

type ViewState = 'idle' | 'loading' | 'success' | 'error';

const SECTION_API: Gstr1aDownloadApiName = 'nil';

const AMT_PATTERN = Validators.pattern(/^\d+(\.\d{1,2})?$/);

function stripAmountCommas(raw: string): string {
  return raw.replace(/,/g, '').trim();
}

function moneyAmountValidator(control: AbstractControl): ValidationErrors | null {
  const raw = (control.value as string | null | undefined)?.trim();
  if (!raw) {
    return null;
  }
  const n = stripAmountCommas(raw);
  if (!/^\d+(\.\d{1,2})?$/.test(n)) {
    return { moneyAmount: true };
  }
  return null;
}

function roundMoney2(n: number): number {
  return Math.round(n * 100) / 100;
}

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

function indianFyLabelFromMmYyyy(retPeriod: string): string {
  if (!RETURN_PERIOD_REGEX.test(retPeriod)) {
    return '—';
  }
  const mm = Number.parseInt(retPeriod.slice(0, 2), 10);
  const yyyy = Number.parseInt(retPeriod.slice(2), 10);
  const fyStart = mm >= 4 ? yyyy : yyyy - 1;
  return `${fyStart}-${String(fyStart + 1).slice(-2)}`;
}

function monthNameFromMmYyyy(retPeriod: string): string {
  if (!RETURN_PERIOD_REGEX.test(retPeriod)) {
    return '—';
  }
  const mm = Number.parseInt(retPeriod.slice(0, 2), 10);
  const yyyy = retPeriod.slice(2);
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  return `${months[mm - 1] ?? retPeriod} ${yyyy}`;
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

function num(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) {
    return v;
  }
  const n = Number.parseFloat(String(v ?? '').trim());
  return Number.isFinite(n) ? n : 0;
}

@Component({
  selector: 'lib-gstr1a-nil-section-page',
  standalone: true,
  imports: [JsonPipe, RouterLink, ReactiveFormsModule],
  templateUrl: './gstr1a-nil-section.page.html',
  styleUrls: ['./gstr1-b2b-add-record.page.scss', './gstr1a-nil-section.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-[60vh]' },
})
export class Gstr1aNilSectionPageComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(Gstr1GstnOtpApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly authStore = inject(AuthStore);
  private readonly userProfile = inject(UserProfileRepository);

  readonly sectionHint =
    GSTR1A_DOWNLOAD_API_OPTIONS.find((x) => x.value === 'nil')?.description ??
    'Nil, exempt, and non-GST supplies';

  readonly rowMeta = GSTR1_NIL_SUPPLY_ROWS;

  readonly gstin = signal('');
  readonly retPeriod = signal('');
  readonly filingLabel = signal('');

  readonly viewState = signal<ViewState>('idle');
  readonly loading = signal(false);
  readonly httpError = signal<unknown>(null);
  readonly logicalErrorText = signal<string | null>(null);
  readonly rawResponse = signal<unknown>(null);
  readonly lastSyncedAt = signal<Date | null>(null);

  readonly retsaveSubmitting = signal(false);
  readonly retsaveError = signal<unknown>(null);
  readonly retsaveSuccessPayload = signal<unknown>(null);

  readonly legalName = signal('');
  readonly tradeName = signal('');

  readonly fyLabel = computed(() => indianFyLabelFromMmYyyy(this.retPeriod().trim()));
  readonly taxPeriodLabel = computed(() => monthNameFromMmYyyy(this.retPeriod().trim()));

  readonly paramsValid = computed(() => {
    const g = this.gstin().trim();
    const r = this.retPeriod().trim();
    return g.length === 15 && RETURN_PERIOD_REGEX.test(r);
  });

  readonly backToGstr1aQueryParams = computed(() => ({
    gstin: this.gstin().trim().toUpperCase() || undefined,
    ret_period: this.retPeriod().trim() || undefined,
    api_name: SECTION_API,
    filing_status: this.filingLabel().trim() || undefined,
  }));

  readonly form = this.fb.group({
    lines: this.fb.array(
      GSTR1_NIL_SUPPLY_ROWS.map(() =>
        this.fb.group({
          nil_amt: ['0.00', [AMT_PATTERN, moneyAmountValidator]],
          expt_amt: ['0.00', [AMT_PATTERN, moneyAmountValidator]],
          ngsup_amt: ['0.00', [AMT_PATTERN, moneyAmountValidator]],
        }),
      ),
    ),
  });

  constructor() {
    const syncRouteParams = (): void => {
      const pm = this.route.snapshot.paramMap;
      const qm = this.route.snapshot.queryParamMap;
      this.gstin.set((qm.get('gstin') ?? pm.get('gstin') ?? '').trim().toUpperCase());
      this.retPeriod.set((qm.get('ret_period') ?? pm.get('retPeriod') ?? '').trim());
      this.filingLabel.set((qm.get('filing_status') ?? '').trim());
      void this.loadSection();
    };
    syncRouteParams();
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => syncRouteParams());
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => syncRouteParams());

    toObservable(this.authStore.user)
      .pipe(
        switchMap((user) => {
          if (!user?.id) {
            return of(undefined);
          }
          return this.userProfile.watchProfileData(user.id).pipe(catchError(() => of(undefined)));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((prof) => {
        const p = prof as Record<string, unknown> | undefined;
        this.legalName.set(
          pickProfileString(p, [
            'legalName',
            'LegalName',
            'legal_name',
            'companyName',
            'CompanyName',
            'organizationName',
            'OrganizationName',
            'name',
            'Name',
          ]),
        );
        this.tradeName.set(
          pickProfileString(p, ['tradeName', 'TradeName', 'trade_name', 'dba']),
        );
      });
  }

  get lines(): FormArray<FormGroup> {
    return this.form.controls.lines;
  }

  lineGroup(i: number): FormGroup {
    return this.lines.at(i) as FormGroup;
  }

  showFieldError(ctrl: AbstractControl): boolean {
    return ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  openGstHelp(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    window.open('https://www.gst.gov.in/', '_blank', 'noopener,noreferrer');
  }

  formatSynced(d: Date | null): string {
    if (!d) {
      return '—';
    }
    return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  }

  async loadSection(): Promise<void> {
    if (!this.paramsValid()) {
      this.viewState.set('idle');
      this.resetFormToZeros();
      return;
    }
    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.viewState.set('loading');
    this.httpError.set(null);
    this.logicalErrorText.set(null);
    this.retsaveError.set(null);
    this.retsaveSuccessPayload.set(null);
    this.resetFormToZeros();

    try {
      const raw = await firstValueFrom(
        this.api.downloadGstr1aReturn({
          gstin: this.gstin().trim().toUpperCase(),
          ret_period: this.retPeriod().trim(),
          api_name: SECTION_API,
        }),
      );

      this.rawResponse.set(raw);

      if (!isGstr1DownloadSuccessEnvelope(raw)) {
        const st =
          raw && typeof raw === 'object' && 'status' in (raw as object)
            ? String((raw as Record<string, unknown>)['status'])
            : '?';
        let msg = `Download did not return success (status = ${st}).`;
        if (
          raw &&
          typeof raw === 'object' &&
          'message' in (raw as object) &&
          typeof (raw as { message?: unknown }).message === 'string'
        ) {
          msg = (raw as { message: string }).message;
        }
        this.logicalErrorText.set(msg);
        this.viewState.set('error');
        return;
      }

      const inv = this.readNilInvFromEnvelope(raw);
      this.patchFormFromInv(inv);
      this.viewState.set('success');
      this.lastSyncedAt.set(new Date());
    } catch (err: unknown) {
      this.httpError.set(normalizeErrorEnvelope(err));
      this.viewState.set('error');
    } finally {
      this.loading.set(false);
      this.cdr.markForCheck();
    }
  }

  private resetFormToZeros(): void {
    for (let i = 0; i < this.lines.length; i++) {
      this.lineGroup(i).reset({
        nil_amt: '0.00',
        expt_amt: '0.00',
        ngsup_amt: '0.00',
      });
    }
  }

  private readNilInvFromEnvelope(raw: unknown): unknown[] {
    if (!raw || typeof raw !== 'object') {
      return [];
    }
    const msg = (raw as Record<string, unknown>)['message'];
    if (!msg || typeof msg !== 'object') {
      return [];
    }
    const nilBucket = (msg as Record<string, unknown>)['nil'];
    if (!nilBucket || typeof nilBucket !== 'object') {
      return [];
    }
    const inv = (nilBucket as Record<string, unknown>)['inv'];
    return Array.isArray(inv) ? inv : [];
  }

  private patchFormFromInv(inv: unknown[]): void {
    const byTy = new Map<string, { nil: number; expt: number; ngsup: number }>();
    for (const item of inv) {
      if (!item || typeof item !== 'object') {
        continue;
      }
      const r = item as Record<string, unknown>;
      const ty = String(r['sply_ty'] ?? '').trim().toUpperCase();
      if (!ty) {
        continue;
      }
      byTy.set(ty, {
        nil: num(r['nil_amt']),
        expt: num(r['expt_amt']),
        ngsup: num(r['ngsup_amt']),
      });
    }
    for (let i = 0; i < GSTR1_NIL_SUPPLY_ROWS.length; i++) {
      const meta = GSTR1_NIL_SUPPLY_ROWS[i];
      const v = byTy.get(meta.sply_ty) ?? { nil: 0, expt: 0, ngsup: 0 };
      this.lineGroup(i).patchValue({
        nil_amt: roundMoney2(v.nil).toFixed(2),
        expt_amt: roundMoney2(v.expt).toFixed(2),
        ngsup_amt: roundMoney2(v.ngsup).toFixed(2),
      });
    }
  }

  private parseAmt(s: string | undefined): number {
    const raw = stripAmountCommas((s ?? '').trim());
    if (!raw) {
      return 0;
    }
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : 0;
  }

  /** NIC `nil: { inv: [...] }` with `sply_ty` order per {@link GSTR1_NIL_RESAVE_INV_ORDER}. */
  private buildNilPayloadFromForm(): { inv: Record<string, unknown>[]; sectionGt: number } {
    const rows = this.lines.getRawValue() as {
      nil_amt: string;
      expt_amt: string;
      ngsup_amt: string;
    }[];

    let sectionGt = 0;
    const inv: Record<string, unknown>[] = [];

    for (const { sply_ty, lineIndex } of GSTR1_NIL_RESAVE_INV_ORDER) {
      const r = rows[lineIndex] ?? { nil_amt: '0', expt_amt: '0', ngsup_amt: '0' };
      const nilAmt = roundMoney2(this.parseAmt(r.nil_amt));
      const exptAmt = roundMoney2(this.parseAmt(r.expt_amt));
      const ngsupAmt = roundMoney2(this.parseAmt(r.ngsup_amt));
      sectionGt += nilAmt + exptAmt + ngsupAmt;
      inv.push({
        sply_ty,
        expt_amt: exptAmt,
        nil_amt: nilAmt,
        ngsup_amt: ngsupAmt,
      });
    }

    sectionGt = roundMoney2(sectionGt);
    return { inv, sectionGt };
  }

  async submitGstr1aRetsave(): Promise<void> {
    if (!this.paramsValid() || this.loading() || this.retsaveSubmitting() || this.viewState() !== 'success') {
      return;
    }
    const raw = this.rawResponse();
    if (!isGstr1DownloadSuccessEnvelope(raw)) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }

    const { inv, sectionGt } = this.buildNilPayloadFromForm();
    const nilSection = { inv };

    const msg = raw.message as Record<string, unknown>;
    const gt =
      typeof msg['gt'] === 'number' && Number.isFinite(msg['gt']) ? msg['gt'] : sectionGt;
    const curGt =
      typeof msg['cur_gt'] === 'number' && Number.isFinite(msg['cur_gt']) ? msg['cur_gt'] : gt;

    const body: Record<string, unknown> = {
      fp: this.retPeriod().trim(),
      gstin: this.gstin().trim().toUpperCase(),
      gt,
      cur_gt: curGt,
      nil: nilSection,
    };

    this.retsaveSubmitting.set(true);
    this.retsaveError.set(null);
    this.retsaveSuccessPayload.set(null);
    try {
      const res = await firstValueFrom(this.api.retsaveGstr1aReturn(body));
      this.retsaveSuccessPayload.set(res);
    } catch (err: unknown) {
      this.retsaveError.set(normalizeErrorEnvelope(err));
    } finally {
      this.retsaveSubmitting.set(false);
      this.cdr.markForCheck();
    }
  }
}
