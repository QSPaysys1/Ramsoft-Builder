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
} from '@ramsoft-builder/gstr1/data-access/gstzen-auth';
import { indianGstinValidator } from '../validators/indian-gstin.validator';
import { catchError, firstValueFrom, of, switchMap } from 'rxjs';

const RETURN_PERIOD_REGEX = /^(0[1-9]|1[0-2])\d{4}$/;
/** Empty or valid GST `MMYYYY` so the form stays valid when only the calendar is used. */
const OPTIONAL_RET_PERIOD_REGEX = /^(?:|(0[1-9]|1[0-2])\d{4})$/;

const MONTH_SHORT = [
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
] as const;

/** Overall filing signal for one return family in a period (derived from dynamic API fields). */
type MonthReturnKind = 'filed' | 'notFiled' | 'pending' | 'error' | 'idle';

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

function asRecord(v: unknown): Record<string, unknown> | undefined {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : undefined;
}

const EFILED_LIST_KEYS = [
  'EFiledlist',
  'efiledlist',
  'E_FILED_LIST',
  'efiledList',
  'EFILED_LIST',
] as const;

/** Rettrack often wraps the list under `message` (or similar); keep root + one nested level + JSON string `message`. */
function eFiledArrayFromRecord(rec: Record<string, unknown>): unknown[] | null {
  for (const k of EFILED_LIST_KEYS) {
    const v = rec[k];
    if (Array.isArray(v)) {
      return v;
    }
  }
  return null;
}

function unwrapNestedRecord(value: unknown): Record<string, unknown> | undefined {
  let v: unknown = value;
  if (typeof v === 'string') {
    const t = v.trim();
    if (t.startsWith('{') || t.startsWith('[')) {
      try {
        v = JSON.parse(t) as unknown;
      } catch {
        return undefined;
      }
    } else {
      return undefined;
    }
  }
  return asRecord(v);
}

function filedListFromPayload(payload: unknown): Record<string, unknown>[] {
  const r = asRecord(payload);
  if (!r) {
    return [];
  }
  let raw = eFiledArrayFromRecord(r);
  if (raw === null) {
    const nestKeys = [
      'message',
      'Message',
      'data',
      'Data',
      'result',
      'Result',
      'response',
      'Response',
      'payload',
      'Payload',
    ] as const;
    for (const nk of nestKeys) {
      const innerRec = unwrapNestedRecord(r[nk]) ?? asRecord(r[nk]);
      if (!innerRec) {
        continue;
      }
      raw = eFiledArrayFromRecord(innerRec);
      if (raw !== null) {
        break;
      }
    }
  }
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter(
    (row): row is Record<string, unknown> =>
      !!row && typeof row === 'object' && !Array.isArray(row),
  );
}

function cellStr(v: unknown): string {
  if (v === null || v === undefined) {
    return '—';
  }
  if (
    typeof v === 'string' ||
    typeof v === 'number' ||
    typeof v === 'boolean'
  ) {
    return String(v);
  }
  return '—';
}

/** Five calendar months ending with the current month (inclusive), oldest column first — e.g. in Apr 2026 the newest column is Apr 2026 (`042026`). */
function lastFiveGstReturnPeriodLabels(
  now = new Date(),
): { readonly label: string; readonly retPeriod: string }[] {
  const out: { label: string; retPeriod: string }[] = [];
  for (let k = 4; k >= 0; k--) {
    const d = new Date(now.getFullYear(), now.getMonth() - k, 1);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = String(d.getFullYear());
    const retPeriod = `${mm}${yyyy}`;
    const label = `${MONTH_SHORT[d.getMonth()]} – ${yyyy}`;
    out.push({ label, retPeriod });
  }
  return out;
}

function normalizeGstPeriodToMmYyyy(raw: unknown): string | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  const s0 = String(raw).trim();
  if (!s0) {
    return null;
  }
  const s = s0.replace(/\s+/g, '');
  if (RETURN_PERIOD_REGEX.test(s)) {
    return s;
  }
  const yyyyMm = /^((?:19|20)\d{2})(0[1-9]|1[0-2])$/;
  const ym = yyyyMm.exec(s);
  if (ym) {
    const yyyy = ym[1];
    const mm = ym[2];
    return `${mm}${yyyy}`;
  }
  const mmYyyySlash = /^([0-9]{1,2})[/-]((?:19|20)\d{2})$/;
  const m = mmYyyySlash.exec(s);
  if (m) {
    const mm = m[1].padStart(2, '0');
    const yyyy = m[2];
    if (/^(0[1-9]|1[0-2])$/.test(mm)) {
      return `${mm}${yyyy}`;
    }
  }
  return null;
}

const ROW_PERIOD_KEYS = [
  'ret_prd',
  'retprd',
  'ret_period',
  'RetPrd',
  'retPrd',
  'RET_PRD',
] as const;

const ROW_GSTIN_KEYS = ['gstin', 'GSTIN', 'Gstin', 'ctin', 'CTIN', 'd_gst'] as const;

/** Only rows for this calendar column: GSTIN on the row must match when present; return month on the row must match when present (else we trust the scoped API response). */
function rowMatchesCalendarColumn(
  row: Record<string, unknown>,
  columnMmYyyy: string,
  requestGstinUpper: string,
): boolean {
  for (const k of ROW_GSTIN_KEYS) {
    const v = row[k];
    if (typeof v === 'string' && v.trim()) {
      if (v.trim().toUpperCase() !== requestGstinUpper) {
        return false;
      }
    }
  }
  const periods: string[] = [];
  for (const k of ROW_PERIOD_KEYS) {
    const n = normalizeGstPeriodToMmYyyy(row[k]);
    if (n !== null) {
      periods.push(n);
    }
  }
  if (periods.length > 0) {
    return periods.includes(columnMmYyyy);
  }
  return true;
}

function normalizeRtnType(row: Record<string, unknown>): string {
  const t =
    row['rtntype'] ?? row['rtn_type'] ?? row['Rtn_Type'] ?? row['Rtntype'];
  return String(t ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '');
}

function isGstr1IffFamily(t: string): boolean {
  return (
    t.includes('GSTR1') ||
    t.includes('GSTR-1') ||
    t === 'IFF' ||
    t.includes('IFF')
  );
}

function isGstr3bFamily(t: string): boolean {
  return t.includes('GSTR3B') || t.includes('GSTR-3B') || /\b3B\b/.test(t);
}

/** Dynamic: gather human-readable fragments from plausible status / message keys. */
function collectStatusLikeText(row: Record<string, unknown>): string {
  const parts: string[] = [];
  const directKeys = ['status', '_Status', 'Status', 'STATUS', 'stts', 'Stts'];
  for (const k of directKeys) {
    const v = row[k];
    if (typeof v === 'string' && v.trim()) {
      parts.push(v.trim());
    }
  }
  for (const [k, v] of Object.entries(row)) {
    if (directKeys.includes(k)) {
      continue;
    }
    if (!/(status|stts|remark|desc|msg|message|error|reason)/i.test(k)) {
      continue;
    }
    if (typeof v === 'string' && v.trim()) {
      parts.push(v.trim());
    }
  }
  return parts.join(' ').toUpperCase();
}

function rowLooksExplicitError(row: Record<string, unknown>): boolean {
  const blob = `${collectStatusLikeText(row)} ${JSON.stringify(row).toUpperCase()}`;
  if (/\berror\b|\bfail\b|\binvalid\b|\breject\b|\bduplicate\b/i.test(blob)) {
    return true;
  }
  const e =
    row['error'] ??
    row['Error'] ??
    row['fault'] ??
    row['faultstring'] ??
    row['faultString'];
  if (typeof e === 'string' && e.trim()) {
    return true;
  }
  return false;
}

function rowLooksPending(row: Record<string, unknown>): boolean {
  const u = collectStatusLikeText(row);
  return (
    u.includes('PENDING') ||
    u.includes('TO BE FILE') ||
    u.includes('TO BE FILED') ||
    u.includes('PROVISIONAL') ||
    u.includes('DRAFT')
  );
}

function rowLooksNotFiled(row: Record<string, unknown>): boolean {
  const u = collectStatusLikeText(row).replace(/\s+/g, ' ');
  if (u.includes('NOT FILED') || u.includes('NOTFILED')) {
    return true;
  }
  if (
    /\bNIL\b|\bNO\s*RECORD\b|\bNO\s*DATA\b|\bUNFILED\b/i.test(collectStatusLikeText(row))
  ) {
    return true;
  }
  return false;
}

function rowLooksFiled(row: Record<string, unknown>): boolean {
  const u = collectStatusLikeText(row);
  if (u.includes('NOT FILED') || u.includes('NOTFILED')) {
    return false;
  }
  const status = String(row['status'] ?? row['_Status'] ?? '')
    .trim()
    .toUpperCase();
  if (status.includes('FILED') || u.includes('FILED')) {
    return true;
  }
  if (status.includes('ACCEPT') || status.includes('PROCEED')) {
    return true;
  }
  const v = String(row['valid'] ?? row['Validity'] ?? '')
    .trim()
    .toUpperCase();
  if (v === 'Y' || v === 'YES') {
    return true;
  }
  const arn = String(row['arn'] ?? row['ARN'] ?? '').trim();
  if (arn.length > 8) {
    return true;
  }
  return false;
}

/** Inspect top-level JSON for gateway / portal fault patterns (dynamic keys). */
function topLevelPayloadError(payload: unknown): string | null {
  const r = asRecord(payload);
  if (!r) {
    return null;
  }
  for (const k of Object.keys(r)) {
    if (!/^(error|Error|fault|Fault|faultstring|faultString|exception|detail)$/i.exec(k)) {
      continue;
    }
    const v = r[k];
    if (typeof v === 'string' && v.trim()) {
      return v.trim();
    }
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const rr = asRecord(v);
      const inner =
        rr?.['message'] ?? rr?.['Message'] ?? rr?.['faultstring'];
      if (typeof inner === 'string' && inner.trim()) {
        return inner.trim();
      }
    }
  }
  return null;
}

function deriveFamilyStatus(
  rows: Record<string, unknown>[],
  columnMmYyyy: string,
  requestGstinUpper: string,
  match: (t: string) => boolean,
): Exclude<MonthReturnKind, 'idle'> {
  const subset = rows.filter(
    (row) =>
      rowMatchesCalendarColumn(row, columnMmYyyy, requestGstinUpper) &&
      match(normalizeRtnType(row)),
  );
  if (subset.some((row) => rowLooksExplicitError(row))) {
    return 'error';
  }
  if (subset.length === 0) {
    return 'notFiled';
  }
  if (subset.some((row) => rowLooksFiled(row))) {
    return 'filed';
  }
  if (subset.some((row) => rowLooksPending(row))) {
    return 'pending';
  }
  if (subset.some((row) => rowLooksNotFiled(row))) {
    return 'notFiled';
  }
  return 'pending';
}

function cacheKey(gstin: string, retPeriod: string): string {
  /** Bump prefix when derivation / payload parsing rules change so session cache resets. */
  return `efd-v2::${gstin.trim().toUpperCase()}::${retPeriod}`;
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
    const k = cacheKey(gstinUpper, retPeriod);
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
    const key = cacheKey(g, retPeriod);

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
    for (const k of keys) {
      if (
        k in row &&
        row[k] !== undefined &&
        row[k] !== null &&
        row[k] !== ''
      ) {
        return cellStr(row[k]);
      }
    }
    return '—';
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
