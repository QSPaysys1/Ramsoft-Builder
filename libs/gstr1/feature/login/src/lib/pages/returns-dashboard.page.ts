import { isPlatformBrowser, JsonPipe, NgClass, TitleCasePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthStore } from '@ramsoft-builder/auth/data-access/auth';
import { UserProfileRepository } from '@ramsoft-builder/e-invoices/data-access/einvoice';
import {
  Gstr1GstnOtpApiService,
  type MonthReturnKind,
  RETURN_PERIOD_REGEX,
  cellFromRow,
  deriveFamilyStatus,
  filedListFromPayload,
  isGstr1IffFamilyExclusive,
  isGstr1aFamily,
  isGstr2aFamily,
  isGstr2bFamily,
  isGstr3bFamily,
  normalizeRtnType,
  pickRepresentativeRow,
  rowArn,
  rowFilingDateLabel,
  topLevelPayloadError,
} from '@ramsoft-builder/gstr1/data-access/gstzen-auth';
import { catchError, firstValueFrom, of, switchMap } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import {
  GST_QUARTERS,
  type IndianFySelection,
  type PeriodMonthOption,
  type QuarterId,
  defaultSelectionForDate,
  listIndianFinancialYears,
  periodMonthsForQuarter,
} from '../utils/indian-fy-return-period';
import { indianGstinValidator } from '../validators/indian-gstin.validator';

const FILTER_STORAGE_KEY = 'gstr1-returns-dashboard-filters-v1';

type AggregateStatus = 'filed' | 'pending' | 'notFiled' | 'error';

interface StoredFilters {
  readonly fyStartYear: number;
  readonly quarter: QuarterId;
  readonly retPeriod: string;
  readonly gstin: string;
}

interface ReturnSectionSpec {
  readonly id: string;
  readonly headerTitle: string;
  readonly headerCode: string;
  readonly match: (t: string) => boolean;
  readonly showDueForGstr3b?: boolean;
}

const RETURN_SECTIONS: readonly ReturnSectionSpec[] = [
  {
    id: 'gstr1',
    headerTitle: 'Details of outward supplies of goods or services',
    headerCode: 'GSTR1',
    match: isGstr1IffFamilyExclusive,
  },
  {
    id: 'gstr1a',
    headerTitle: 'Amendment of outward supplies of goods or services for current tax period',
    headerCode: 'GSTR-1A',
    match: isGstr1aFamily,
  },
  {
    id: 'gstr2b',
    headerTitle: 'Auto – drafted ITC Statement for the month',
    headerCode: 'GSTR2B',
    match: isGstr2bFamily,
  },
  {
    id: 'gstr3b',
    headerTitle: 'Monthly Return',
    headerCode: 'GSTR-3B',
    match: isGstr3bFamily,
    showDueForGstr3b: true,
  },
  {
    id: 'gstr2a',
    headerTitle: 'Auto drafted details (For view only)',
    headerCode: 'GSTR2A',
    match: isGstr2aFamily,
  },
];

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

function formatGstr3bDueDate(retPeriod: string): string {
  if (!RETURN_PERIOD_REGEX.test(retPeriod)) {
    return '';
  }
  const mm = Number.parseInt(retPeriod.slice(0, 2), 10);
  const yyyy = Number.parseInt(retPeriod.slice(2), 10);
  const d = new Date(yyyy, mm - 1, 20);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function aggregateFromKinds(
  kinds: readonly Exclude<MonthReturnKind, 'idle'>[],
): AggregateStatus {
  if (kinds.includes('error')) {
    return 'error';
  }
  if (kinds.includes('pending')) {
    return 'pending';
  }
  if (kinds.every((k) => k === 'filed')) {
    return 'filed';
  }
  if (kinds.some((k) => k === 'filed')) {
    return 'pending';
  }
  return 'notFiled';
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

export interface ReturnCardVm {
  readonly spec: ReturnSectionSpec;
  readonly kind: Exclude<MonthReturnKind, 'idle'>;
  readonly arn: string;
  readonly filingDate: string;
  readonly rtnTypeLabel: string;
  readonly statusCell: string;
  readonly dueDateLine?: string;
}

@Component({
  selector: 'lib-returns-dashboard-page',
  standalone: true,
  imports: [
    JsonPipe,
    NgClass,
    TitleCasePipe,
    ReactiveFormsModule,
    RouterLink,
  ],
  templateUrl: './returns-dashboard.page.html',
  styleUrl: './returns-dashboard.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block min-h-[60vh]',
  },
})
export class ReturnsDashboardPageComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly gstnApi = inject(Gstr1GstnOtpApiService);
  private readonly authStore = inject(AuthStore);
  private readonly userProfile = inject(UserProfileRepository);

  readonly fyOptions = signal<IndianFySelection[]>(
    listIndianFinancialYears(new Date()),
  );

  readonly selectedFyStart = signal<number>(
    defaultSelectionForDate(new Date()).fy.startYear,
  );
  readonly selectedQuarter = signal<QuarterId>(
    defaultSelectionForDate(new Date()).quarter,
  );
  readonly selectedRetPeriod = signal<string>(
    defaultSelectionForDate(new Date()).retPeriod,
  );

  readonly periodOptions = computed((): PeriodMonthOption[] =>
    periodMonthsForQuarter(this.selectedFyStart(), this.selectedQuarter()),
  );

  readonly form = this.fb.nonNullable.group({
    gstin: ['', [Validators.required, indianGstinValidator]],
  });

  readonly gstinSnap = toSignal(
    this.form.valueChanges.pipe(
      startWith(this.form.getRawValue()),
      map(() => this.form.getRawValue().gstin ?? ''),
    ),
    { initialValue: this.form.getRawValue().gstin ?? '' },
  );

  readonly loading = signal(false);
  readonly payloadOk = signal<boolean | null>(null);
  readonly rawPayload = signal<unknown>(null);
  readonly httpError = signal<unknown>(null);
  readonly lastSearchLabel = signal<string>('');

  readonly filedRows = computed(() =>
    this.payloadOk() === true
      ? filedListFromPayload(this.rawPayload())
      : [],
  );

  readonly returnCards = computed((): ReturnCardVm[] => {
    const rows = this.filedRows();
    const gstin = this.form.controls.gstin.getRawValue()?.trim().toUpperCase() ?? '';
    const ret = this.selectedRetPeriod().trim();
    if (!gstin || !RETURN_PERIOD_REGEX.test(ret)) {
      return [];
    }
    return RETURN_SECTIONS.map((spec) => {
      const kind = deriveFamilyStatus(rows, ret, gstin, spec.match);
      const rep = pickRepresentativeRow(rows, ret, gstin, spec.match);
      const due =
        spec.showDueForGstr3b && kind !== 'filed'
          ? formatGstr3bDueDate(ret)
          : undefined;
      return {
        spec,
        kind,
        arn: rowArn(rep),
        filingDate: rowFilingDateLabel(rep),
        rtnTypeLabel: cellFromRow(rep ?? {}, 'rtntype', 'rtn_type', 'Rtntype'),
        statusCell: cellFromRow(rep ?? {}, 'status', '_Status', 'Status'),
        dueDateLine: due && spec.showDueForGstr3b ? due : undefined,
      };
    });
  });

  /** GSTR-1 and GSTR-1A — primary filing surfaces after Search. */
  readonly primaryReturnCards = computed((): ReturnCardVm[] => {
    const cards = this.returnCards();
    const g1 = cards.find((c) => c.spec.id === 'gstr1');
    const g1a = cards.find((c) => c.spec.id === 'gstr1a');
    const out: ReturnCardVm[] = [];
    if (g1) {
      out.push(g1);
    }
    if (g1a) {
      out.push(g1a);
    }
    return out;
  });

  readonly otherReturnCards = computed(() =>
    this.returnCards().filter((c) => c.spec.id !== 'gstr1' && c.spec.id !== 'gstr1a'),
  );

  readonly eFiledPrimaryRows = computed(() => {
    const rows = this.filedRows();
    return rows.filter((row) => {
      const t = normalizeRtnType(row);
      return isGstr1IffFamilyExclusive(t) || isGstr1aFamily(t);
    });
  });

  readonly summary = computed(() => {
    const cards = this.returnCards();
    const filed = cards.filter((c) => c.kind === 'filed').length;
    const pending = cards.filter((c) => c.kind === 'pending').length;
    const errors = cards.filter((c) => c.kind === 'error').length;
    const notFiled = cards.filter((c) => c.kind === 'notFiled').length;
    const agg = aggregateFromKinds(cards.map((c) => c.kind));
    return { filed, pending, errors, notFiled, agg, total: cards.length };
  });

  readonly hasTableRows = computed(() => this.filedRows().length > 0);

  readonly topBanner =
    'Nil return for GSTR-1, GSTR-3B and CMP-08 can now be filed through SMS.';

  readonly quarterOptions = GST_QUARTERS;

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) {
        return;
      }
      this.fyOptions.set(listIndianFinancialYears(new Date()));
      this.restoreFiltersFromStorage();
    });

    effect(() => {
      if (!isPlatformBrowser(this.platformId)) {
        return;
      }
      const gstin = this.gstinSnap().trim();
      const snap: StoredFilters = {
        fyStartYear: this.selectedFyStart(),
        quarter: this.selectedQuarter(),
        retPeriod: this.selectedRetPeriod(),
        gstin: gstin.toUpperCase(),
      };
      sessionStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(snap));
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

    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.resetResponse();
      });
  }

  onFyChange(value: string): void {
    const y = Number.parseInt(value, 10);
    if (!Number.isFinite(y)) {
      return;
    }
    this.selectedFyStart.set(y);
    this.syncPeriodWithinQuarter();
  }

  onQuarterChange(value: string): void {
    this.selectedQuarter.set(value as QuarterId);
    this.syncPeriodWithinQuarter();
  }

  onPeriodChange(value: string): void {
    this.selectedRetPeriod.set(value);
  }

  private syncPeriodWithinQuarter(): void {
    const opts = this.periodOptions();
    const cur = this.selectedRetPeriod();
    if (opts.some((o) => o.retPeriod === cur)) {
      return;
    }
    this.selectedRetPeriod.set(opts[0]?.retPeriod ?? cur);
  }

  private restoreFiltersFromStorage(): void {
    try {
      const raw = sessionStorage.getItem(FILTER_STORAGE_KEY);
      if (!raw) {
        return;
      }
      const o = JSON.parse(raw) as Partial<StoredFilters>;
      const fys = this.fyOptions().map((x) => x.startYear);
      if (typeof o.fyStartYear === 'number' && fys.includes(o.fyStartYear)) {
        this.selectedFyStart.set(o.fyStartYear);
      }
      if (o.quarter === 'q1' || o.quarter === 'q2' || o.quarter === 'q3' || o.quarter === 'q4') {
        this.selectedQuarter.set(o.quarter);
      }
      if (typeof o.retPeriod === 'string' && RETURN_PERIOD_REGEX.test(o.retPeriod)) {
        this.selectedRetPeriod.set(o.retPeriod);
        this.syncPeriodWithinQuarter();
      }
      if (typeof o.gstin === 'string' && o.gstin.trim().length === 15) {
        this.form.patchValue({ gstin: o.gstin.trim().toUpperCase() }, { emitEvent: false });
      }
    } catch {
      /* ignore */
    }
  }

  private resetResponse(): void {
    this.payloadOk.set(null);
    this.rawPayload.set(null);
    this.httpError.set(null);
  }

  async search(): Promise<void> {
    if (this.loading()) {
      return;
    }
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const gstin = this.form.controls.gstin.getRawValue().trim().toUpperCase();
    const ret_period = this.selectedRetPeriod().trim();
    if (!RETURN_PERIOD_REGEX.test(ret_period)) {
      return;
    }

    this.loading.set(true);
    this.resetResponse();

    try {
      const payload = await firstValueFrom(
        this.gstnApi.viewAndTrackReturns({ gstin, ret_period }),
      );
      const topErr = topLevelPayloadError(payload);
      if (topErr) {
        this.payloadOk.set(false);
        this.rawPayload.set(payload);
        this.httpError.set({ message: topErr });
        this.lastSearchLabel.set(this.buildSearchSummary(gstin, ret_period));
        return;
      }
      this.payloadOk.set(true);
      this.rawPayload.set(payload);
      this.lastSearchLabel.set(this.buildSearchSummary(gstin, ret_period));
    } catch (err: unknown) {
      this.payloadOk.set(false);
      this.httpError.set(normalizeErrorEnvelope(err));
      this.lastSearchLabel.set(this.buildSearchSummary(gstin, ret_period));
    } finally {
      this.loading.set(false);
    }
  }

  refresh(): void {
    void this.search();
  }

  private buildSearchSummary(gstin: string, retPeriod: string): string {
    const fy = this.fyOptions().find((x) => x.startYear === this.selectedFyStart());
    const q = GST_QUARTERS.find((x) => x.id === this.selectedQuarter());
    const pm = this.periodOptions().find((p) => p.retPeriod === retPeriod);
    return [gstin, fy?.label, q?.label, pm?.label, retPeriod].filter(Boolean).join(' · ');
  }

  cell(row: Record<string, unknown>, ...keys: string[]): string {
    return cellFromRow(row, ...keys);
  }

  statusPillClass(kind: Exclude<MonthReturnKind, 'idle'>): Record<string, boolean> {
    return {
      'bg-emerald-600 text-white ring-1 ring-emerald-800/20': kind === 'filed',
      'bg-amber-500 text-white ring-1 ring-amber-800/20': kind === 'pending',
      'bg-slate-200 text-slate-700 ring-1 ring-slate-300/40': kind === 'notFiled',
      'bg-red-600 text-white ring-1 ring-red-900/30': kind === 'error',
    };
  }

  statusLabel(kind: Exclude<MonthReturnKind, 'idle'>): string {
    switch (kind) {
      case 'filed':
        return 'Filed';
      case 'pending':
        return 'Pending';
      case 'notFiled':
        return 'Not filed';
      case 'error':
        return 'Error';
      default:
        return '—';
    }
  }

  summaryStripClass(agg: AggregateStatus): Record<string, boolean> {
    return {
      'border-emerald-200 bg-emerald-50 text-emerald-950': agg === 'filed',
      'border-amber-200 bg-amber-50 text-amber-950': agg === 'pending',
      'border-slate-200 bg-white text-slate-800': agg === 'notFiled',
      'border-red-200 bg-red-50 text-red-950': agg === 'error',
    };
  }

  retPeriodDisplay(mmYyyy: string): string {
    if (!RETURN_PERIOD_REGEX.test(mmYyyy)) {
      return mmYyyy;
    }
    const mm = Number.parseInt(mmYyyy.slice(0, 2), 10);
    const yyyy = mmYyyy.slice(2);
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return `${months[mm - 1] ?? mm} ${yyyy}`;
  }
}
