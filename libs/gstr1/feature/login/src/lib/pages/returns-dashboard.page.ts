import { isPlatformBrowser, JsonPipe, NgClass, TitleCasePipe } from '@angular/common';
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
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthStore } from '@ramsoft-builder/auth/data-access/auth';
import { UserProfileRepository } from '@ramsoft-builder/e-invoices/data-access/einvoice';
import {
  GstrReturnPeriodStore,
  GstrReturnsDashboardStore,
  GST_QUARTERS,
  type QuarterId,
  periodMonthsForQuarter,
} from '@ramsoft-builder/gstr1/data-access/gstr-returns';
import {
  type MonthReturnKind,
  RETURN_PERIOD_REGEX,
  asRecord,
  cellFromRow,
  deriveFamilyStatus,
  isGstr1IffFamily,
  isGstr1IffFamilyExclusive,
  isGstr1aFamily,
  isGstr2aFamily,
  isGstr2bFamily,
  isGstr3bFamily,
  normalizeGstPeriodToMmYyyy,
  normalizeRtnType,
  pickRepresentativeRow,
  rowArn,
  rowFilingDateLabel,
} from '@ramsoft-builder/gstr1/data-access/gstzen-auth';
import { catchError, combineLatest, map, of, switchMap } from 'rxjs';
import { resolveLoggedInUserGstrGstin } from '../utils/gstr1-profile-credentials.utils';

type AggregateStatus = 'filed' | 'pending' | 'notFiled' | 'error';

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

const MONTHLY_FREQUENCY_MESSAGE =
  'You have selected to file the return on monthly frequency, GSTR-1 and GSTR-3B shall be required to be filed for each month of the quarter.';

type TaxpayerFilingFrequency = 'monthly' | 'qrmp' | 'unknown';

export function getMonthlyFrequencyMessage(): string {
  return MONTHLY_FREQUENCY_MESSAGE;
}

export function isMonthlyFiler(frequency: TaxpayerFilingFrequency): boolean {
  return frequency === 'monthly';
}

function quarterFrequencyKey(fyStartYear: number, quarter: QuarterId): string {
  const qNum = quarter === 'q1' ? 1 : quarter === 'q2' ? 2 : quarter === 'q3' ? 3 : 4;
  const year =
    quarter === 'q4'
      ? fyStartYear + 1
      : fyStartYear;
  return `${year}_Q${qNum}`;
}

function parseFrequencyToken(raw: unknown): TaxpayerFilingFrequency | null {
  if (typeof raw !== 'string') {
    return null;
  }
  const t = raw.trim().toUpperCase();
  if (!t) {
    return null;
  }
  if (
    t === 'M' ||
    t === 'MONTHLY' ||
    t === 'MONTH' ||
    t.includes('MONTHLY')
  ) {
    return 'monthly';
  }
  if (
    t === 'Q' ||
    t === 'QRMP' ||
    t === 'QUARTERLY' ||
    t === 'QUARTER' ||
    t.includes('QUARTER')
  ) {
    return 'qrmp';
  }
  return null;
}

function explicitFrequencyFromRecord(
  rec: Record<string, unknown>,
  fyStartYear: number,
  quarter: QuarterId,
): TaxpayerFilingFrequency | null {
  const qKey = quarterFrequencyKey(fyStartYear, quarter);
  const qKeyAlt = qKey.replace('_Q', '_q');
  const directKeys = [
    'filing_freq',
    'filingFreq',
    'fillingFreq',
    'ret_freq',
    'return_freq',
    'frequency',
    'qrt_type',
    'QRT_TYPE',
    'filingPref',
    'filing_pref',
    'pref',
  ] as const;

  for (const k of directKeys) {
    const v = rec[k];
    if (typeof v === 'string') {
      const parsed = parseFrequencyToken(v);
      if (parsed) {
        return parsed;
      }
    }
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const nested = v as Record<string, unknown>;
      const byQuarter =
        nested[qKey] ??
        nested[qKeyAlt] ??
        nested[quarter] ??
        nested[quarter.toUpperCase()];
      const parsed = parseFrequencyToken(byQuarter);
      if (parsed) {
        return parsed;
      }
    }
  }

  for (const [k, v] of Object.entries(rec)) {
    if (!/(freq|qrt|pref|periodicity|scheme)/i.test(k)) {
      continue;
    }
    if (typeof v === 'string') {
      const parsed = parseFrequencyToken(v);
      if (parsed) {
        return parsed;
      }
    }
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const nested = v as Record<string, unknown>;
      const byQuarter =
        nested[qKey] ??
        nested[qKeyAlt] ??
        nested[quarter] ??
        nested[quarter.toUpperCase()];
      const parsed = parseFrequencyToken(byQuarter);
      if (parsed) {
        return parsed;
      }
    }
  }
  return null;
}

function detectFilingFrequencyFromPayload(
  payload: unknown,
  fyStartYear: number,
  quarter: QuarterId,
): TaxpayerFilingFrequency | null {
  const root = asRecord(payload);
  if (!root) {
    return null;
  }
  const queue: Record<string, unknown>[] = [root];
  const seen = new Set<Record<string, unknown>>();
  while (queue.length > 0) {
    const rec = queue.shift();
    if (!rec || seen.has(rec)) {
      continue;
    }
    seen.add(rec);
    const hit = explicitFrequencyFromRecord(rec, fyStartYear, quarter);
    if (hit) {
      return hit;
    }
    for (const v of Object.values(rec)) {
      const nested = asRecord(v);
      if (nested) {
        queue.push(nested);
      }
    }
  }
  return null;
}

function isIffFamily(t: string): boolean {
  return t === 'IFF' || t.includes('IFF');
}

function inferFilingFrequencyFromRows(
  rows: Record<string, unknown>[],
  gstin: string,
  fyStartYear: number,
  quarter: QuarterId,
): TaxpayerFilingFrequency {
  const months = periodMonthsForQuarter(fyStartYear, quarter);
  if (months.length < 3) {
    return 'unknown';
  }
  const m1m2 = months.slice(0, 2);

  const gstr3bFiledInM1M2 = m1m2.some(
    (m) =>
      deriveFamilyStatus(rows, m.retPeriod, gstin, isGstr3bFamily) === 'filed',
  );
  if (gstr3bFiledInM1M2) {
    return 'monthly';
  }

  const iffInM1M2 = rows.some((row) => {
    const period = normalizeGstPeriodToMmYyyy(
      row['ret_prd'] ?? row['retprd'] ?? row['ret_period'],
    );
    if (!period || !m1m2.some((m) => m.retPeriod === period)) {
      return false;
    }
    return isIffFamily(normalizeRtnType(row));
  });
  if (iffInM1M2) {
    return 'qrmp';
  }

  const gstr3bMonthsFiled = months.filter(
    (m) =>
      deriveFamilyStatus(rows, m.retPeriod, gstin, isGstr3bFamily) === 'filed',
  );
  if (gstr3bMonthsFiled.length >= 2) {
    return 'monthly';
  }

  const gstr1MonthsFiled = months.filter(
    (m) =>
      deriveFamilyStatus(rows, m.retPeriod, gstin, isGstr1IffFamilyExclusive) ===
      'filed',
  );
  if (
    gstr1MonthsFiled.length === 1 &&
    gstr1MonthsFiled[0]?.retPeriod === months[2]?.retPeriod
  ) {
    return 'qrmp';
  }

  if (
    gstr3bMonthsFiled.length === 1 &&
    gstr3bMonthsFiled[0]?.retPeriod === months[2]?.retPeriod
  ) {
    return 'qrmp';
  }

  return 'unknown';
}

function resolveTaxpayerFilingFrequency(
  payload: unknown,
  rows: Record<string, unknown>[],
  gstin: string,
  fyStartYear: number,
  quarter: QuarterId,
): TaxpayerFilingFrequency {
  return (
    detectFilingFrequencyFromPayload(payload, fyStartYear, quarter) ??
    inferFilingFrequencyFromRows(rows, gstin, fyStartYear, quarter)
  );
}

function endOfDueDay(year: number, month1to12: number, day: number): Date {
  return new Date(year, month1to12 - 1, day, 23, 59, 59, 999);
}

function isMonthlyGstr1DueDatePassed(retPeriod: string, now = new Date()): boolean {
  if (!RETURN_PERIOD_REGEX.test(retPeriod)) {
    return false;
  }
  const mm = Number.parseInt(retPeriod.slice(0, 2), 10);
  const yyyy = Number.parseInt(retPeriod.slice(2), 10);
  const dueMonth = mm === 12 ? 1 : mm + 1;
  const dueYear = mm === 12 ? yyyy + 1 : yyyy;
  return now.getTime() >= endOfDueDay(dueYear, dueMonth, 11).getTime();
}

function isQuarterlyGstr1DueDatePassed(
  fyStartYear: number,
  quarter: QuarterId,
  now = new Date(),
): boolean {
  const months = periodMonthsForQuarter(fyStartYear, quarter);
  const last = months[months.length - 1];
  if (!last) {
    return false;
  }
  const mm = Number.parseInt(last.retPeriod.slice(0, 2), 10);
  const yyyy = Number.parseInt(last.retPeriod.slice(2), 10);
  const dueMonth = mm === 12 ? 1 : mm + 1;
  const dueYear = mm === 12 ? yyyy + 1 : yyyy;
  return now.getTime() >= endOfDueDay(dueYear, dueMonth, 13).getTime();
}

function isGstr1ReadyForGstr1a(
  rows: Record<string, unknown>[],
  retPeriod: string,
  gstin: string,
  frequency: TaxpayerFilingFrequency,
  fyStartYear: number,
  quarter: QuarterId,
  now = new Date(),
): boolean {
  if (frequency === 'monthly' || frequency === 'unknown') {
    const kind = deriveFamilyStatus(
      rows,
      retPeriod,
      gstin,
      isGstr1IffFamilyExclusive,
    );
    return kind === 'filed' || isMonthlyGstr1DueDatePassed(retPeriod, now);
  }

  const months = periodMonthsForQuarter(fyStartYear, quarter);
  const m3 = months[months.length - 1];
  if (!m3) {
    return false;
  }
  const quarterGstr1 = deriveFamilyStatus(
    rows,
    m3.retPeriod,
    gstin,
    isGstr1IffFamilyExclusive,
  );
  if (quarterGstr1 === 'filed') {
    return true;
  }
  const iffFiled = months.some(
    (m) =>
      deriveFamilyStatus(rows, m.retPeriod, gstin, isIffFamily) === 'filed' ||
      deriveFamilyStatus(rows, m.retPeriod, gstin, isGstr1IffFamily) === 'filed',
  );
  if (iffFiled) {
    return true;
  }
  return isQuarterlyGstr1DueDatePassed(fyStartYear, quarter, now);
}

function isGstr3bBlockingGstr1a(
  rows: Record<string, unknown>[],
  retPeriod: string,
  gstin: string,
  frequency: TaxpayerFilingFrequency,
  fyStartYear: number,
  quarter: QuarterId,
): boolean {
  if (frequency === 'qrmp') {
    const months = periodMonthsForQuarter(fyStartYear, quarter);
    return months.some(
      (m) =>
        deriveFamilyStatus(rows, m.retPeriod, gstin, isGstr3bFamily) === 'filed',
    );
  }
  return deriveFamilyStatus(rows, retPeriod, gstin, isGstr3bFamily) === 'filed';
}

export interface Gstr1aCardEligibility {
  readonly showCard: boolean;
  readonly prepareEnabled: boolean;
  readonly disabledReason: string;
}

export function computeGstr1aEligibility(input: {
  readonly returnItem: ReturnCardVm;
  readonly gstr1Card?: ReturnCardVm;
  readonly gstr3bCard?: ReturnCardVm;
  readonly rows: Record<string, unknown>[];
  readonly gstin: string;
  readonly retPeriod: string;
  readonly frequency: TaxpayerFilingFrequency;
  readonly fyStartYear: number;
  readonly quarter: QuarterId;
  readonly payloadOk: boolean;
  readonly now?: Date;
}): Gstr1aCardEligibility {
  const {
    returnItem,
    rows,
    gstin,
    retPeriod,
    frequency,
    fyStartYear,
    quarter,
    payloadOk,
    now = new Date(),
  } = input;

  if (returnItem.spec.id !== 'gstr1a' || !payloadOk) {
    return { showCard: false, prepareEnabled: false, disabledReason: '' };
  }

  if (returnItem.kind === 'filed') {
    return {
      showCard: true,
      prepareEnabled: false,
      disabledReason: 'GSTR-1A is already filed for this period.',
    };
  }

  if (
    isGstr3bBlockingGstr1a(rows, retPeriod, gstin, frequency, fyStartYear, quarter)
  ) {
    return {
      showCard: true,
      prepareEnabled: false,
      disabledReason:
        'GSTR-3B is filed for this period — GSTR-1A is no longer available.',
    };
  }

  if (
    !isGstr1ReadyForGstr1a(
      rows,
      retPeriod,
      gstin,
      frequency,
      fyStartYear,
      quarter,
      now,
    )
  ) {
    return {
      showCard: true,
      prepareEnabled: false,
      disabledReason:
        frequency === 'qrmp'
          ? 'Available after quarterly GSTR-1 is filed or its due date passes.'
          : 'Available after GSTR-1 is filed or its due date (11th of next month) passes.',
    };
  }

  if (returnItem.kind === 'error') {
    return {
      showCard: true,
      prepareEnabled: false,
      disabledReason: 'Rettrack reported an error for GSTR-1A in this period.',
    };
  }

  return { showCard: true, prepareEnabled: true, disabledReason: '' };
}

export function canShowGstr1A(
  returnItem: ReturnCardVm,
  eligibility: Gstr1aCardEligibility,
): boolean {
  return returnItem.spec.id === 'gstr1a' && eligibility.showCard;
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
  imports: [JsonPipe, NgClass, TitleCasePipe, RouterLink, FormsModule],
  templateUrl: './returns-dashboard.page.html',
  styleUrl: './returns-dashboard.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block min-h-[60vh]',
  },
})
export class ReturnsDashboardPageComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly periodStore = inject(GstrReturnPeriodStore);
  private readonly dashboardStore = inject(GstrReturnsDashboardStore);
  private readonly authStore = inject(AuthStore);
  private readonly userProfile = inject(UserProfileRepository);

  readonly fyOptions = this.periodStore.fyOptions;
  readonly selectedFyStart = this.periodStore.selectedFyStart;
  readonly selectedQuarter = this.periodStore.selectedQuarter;
  readonly selectedRetPeriod = this.periodStore.selectedRetPeriod;
  readonly periodOptions = this.periodStore.periodOptions;

  readonly profileGstin = signal('');

  readonly hasValidGstin = computed(() => this.profileGstin().length === 15);

  readonly canSearch = computed(
    () => this.hasValidGstin() && this.periodStore.canUseRetPeriod(),
  );

  readonly loading = this.dashboardStore.loading;
  readonly payloadOk = this.dashboardStore.payloadOk;
  readonly rawPayload = this.dashboardStore.rawPayload;
  readonly httpError = this.dashboardStore.httpError;
  readonly lastSearchLabel = this.dashboardStore.lastSearchLabel;
  readonly monthlyFrequencyBannerDismissed = signal(false);

  readonly filedRows = this.dashboardStore.filedRows;

  readonly filingFrequency = computed((): TaxpayerFilingFrequency => {
    if (this.payloadOk() !== true) {
      return 'unknown';
    }
    const gstin = this.profileGstin();
    const ret = this.selectedRetPeriod().trim();
    if (!gstin || !RETURN_PERIOD_REGEX.test(ret)) {
      return 'unknown';
    }
    return resolveTaxpayerFilingFrequency(
      this.rawPayload(),
      this.filedRows(),
      gstin,
      this.selectedFyStart(),
      this.selectedQuarter(),
    );
  });

  readonly gstr1aEligibility = computed((): Gstr1aCardEligibility => {
    const cards = this.returnCards();
    const g1a = cards.find((c) => c.spec.id === 'gstr1a');
    if (!g1a) {
      return { showCard: false, prepareEnabled: false, disabledReason: '' };
    }
    return computeGstr1aEligibility({
      returnItem: g1a,
      gstr1Card: cards.find((c) => c.spec.id === 'gstr1'),
      gstr3bCard: cards.find((c) => c.spec.id === 'gstr3b'),
      rows: this.filedRows(),
      gstin: this.profileGstin(),
      retPeriod: this.selectedRetPeriod().trim(),
      frequency: this.filingFrequency(),
      fyStartYear: this.selectedFyStart(),
      quarter: this.selectedQuarter(),
      payloadOk: this.payloadOk() === true,
    });
  });

  readonly returnCards = computed((): ReturnCardVm[] => {
    const rows = this.filedRows();
    const gstin = this.profileGstin();
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

  readonly primaryReturnCards = computed((): ReturnCardVm[] => {
    const cards = this.returnCards();
    const g1 = cards.find((c) => c.spec.id === 'gstr1');
    const g1a = cards.find((c) => c.spec.id === 'gstr1a');
    const eligibility = this.gstr1aEligibility();
    const out: ReturnCardVm[] = [];
    if (g1) {
      out.push(g1);
    }
    if (g1a && canShowGstr1A(g1a, eligibility)) {
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
      this.initializeFilters();
    });

    toObservable(this.authStore.user)
      .pipe(
        switchMap((user) => {
          if (!user?.id) {
            this.profileGstin.set('');
            return of(null);
          }
          return combineLatest([
            this.userProfile.watchProfileData(user.id).pipe(
              catchError(() => of(undefined)),
            ),
            this.userProfile.watchLegacyUserFlat(user.id).pipe(
              catchError(() => of(undefined)),
            ),
          ]).pipe(
            map(([prof, flat]) => ({
              prof: prof as Record<string, unknown> | undefined,
              flat,
              email: user.email,
            })),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((bundle) => {
        if (!bundle) {
          return;
        }
        this.profileGstin.set(
          resolveLoggedInUserGstrGstin(bundle.prof, bundle.flat, bundle.email),
        );
      });
  }

  onFyChange(value: string): void {
    const y = Number.parseInt(value, 10);
    if (!Number.isFinite(y)) {
      return;
    }
    this.periodStore.setFyStartYear(y);
  }

  onQuarterChange(value: string): void {
    this.periodStore.setQuarter(value as QuarterId);
  }

  onPeriodChange(value: string): void {
    this.periodStore.setRetPeriod(value);
  }

  private initializeFilters(): void {
    this.periodStore.initializeFilters(new Date());
  }

  async search(): Promise<void> {
    if (this.loading() || !this.canSearch()) {
      return;
    }
    this.periodStore.ensureCoherent();
    const gstin = this.profileGstin();
    const ret_period = this.selectedRetPeriod().trim();
    this.monthlyFrequencyBannerDismissed.set(false);
    await this.dashboardStore.search(
      gstin,
      ret_period,
      this.buildSearchSummary(gstin, ret_period),
    );
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

  taxpayerIsMonthlyFiler(): boolean {
    return isMonthlyFiler(this.filingFrequency());
  }

  monthlyFrequencyMessage(): string | null {
    if (!this.taxpayerIsMonthlyFiler() || this.payloadOk() !== true) {
      return null;
    }
    return getMonthlyFrequencyMessage();
  }

  showMonthlyFrequencyBanner(): boolean {
    return (
      this.monthlyFrequencyMessage() !== null &&
      !this.monthlyFrequencyBannerDismissed()
    );
  }

  dismissMonthlyFrequencyBanner(): void {
    this.monthlyFrequencyBannerDismissed.set(true);
  }

  isGstr1aPrepareEnabled(card: ReturnCardVm): boolean {
    if (card.spec.id !== 'gstr1a') {
      return true;
    }
    return this.gstr1aEligibility().prepareEnabled;
  }

  gstr1aDisabledReason(card: ReturnCardVm): string {
    if (card.spec.id !== 'gstr1a') {
      return '';
    }
    return this.gstr1aEligibility().disabledReason;
  }

  gstr1aCardClass(card: ReturnCardVm): Record<string, boolean> {
    const disabled =
      card.spec.id === 'gstr1a' && !this.isGstr1aPrepareEnabled(card);
    return {
      'opacity-60 saturate-50': disabled,
    };
  }
}
