import { isPlatformBrowser, JsonPipe } from '@angular/common';
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
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthStore } from '@ramsoft-builder/auth/data-access/auth';
import { UserProfileRepository } from '@ramsoft-builder/e-invoices/data-access/einvoice';
import {
  Gstr1GstnOtpApiService,
  GSTR1A_DOWNLOAD_API_OPTIONS,
  RETURN_PERIOD_REGEX,
  extractGstr1DownloadMessageArray,
  isGstr1DownloadSuccessEnvelope,
  type Gstr1aDownloadApiName,
} from '@ramsoft-builder/gstr1/data-access/gstzen-auth';
import { catchError, firstValueFrom, of, switchMap } from 'rxjs';
import { INDIAN_STATE_POS_OPTIONS } from './indian-state-pos.options';

type ViewState = 'idle' | 'loading' | 'success' | 'empty' | 'error';

const SECTION_API: Gstr1aDownloadApiName = 'at';

export type Gstr1aAtItemRow = {
  rt: number;
  ad_amt: number;
  iamt: number;
  camt: number;
  samt: number;
  csamt: number;
};

export type Gstr1aAtBlockView = {
  /** Stable row id for Angular keyed iteration. */
  sourceIndex: number;
  pos: string;
  posLabel: string;
  sply_ty: string;
  sply_ty_label: string;
  diff_percent: number | null;
  itms: Gstr1aAtItemRow[];
};

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

function posLabelFromCode(code: string): string {
  const c = code.trim();
  const opt = INDIAN_STATE_POS_OPTIONS.find((o) => o.code === c);
  return opt?.label ?? c;
}

function parseAtBlocks(bucket: unknown[]): Gstr1aAtBlockView[] {
  const out: Gstr1aAtBlockView[] = [];
  let nextIdx = 0;
  for (const raw of bucket) {
    if (!raw || typeof raw !== 'object') {
      continue;
    }
    const r = raw as Record<string, unknown>;
    const pos = String(r['pos'] ?? '').trim();
    const sply = String(r['sply_ty'] ?? '').trim().toUpperCase();
    const diffRaw = r['diff_percent'];
    const diff =
      typeof diffRaw === 'number' && Number.isFinite(diffRaw)
        ? diffRaw
        : diffRaw !== undefined && diffRaw !== null && String(diffRaw).trim() !== ''
          ? num(diffRaw)
          : null;
    const itmsRaw = r['itms'];
    const itms: Gstr1aAtItemRow[] = [];
    if (Array.isArray(itmsRaw)) {
      for (const line of itmsRaw) {
        if (!line || typeof line !== 'object') {
          continue;
        }
        const l = line as Record<string, unknown>;
        const det = (l['itm_det'] as Record<string, unknown> | undefined) ?? l;
        itms.push({
          rt: num(det['rt']),
          ad_amt: num(det['ad_amt']),
          iamt: num(det['iamt']),
          camt: num(det['camt']),
          samt: num(det['samt']),
          csamt: num(det['csamt']),
        });
      }
    }
    if (!pos && itms.length === 0) {
      continue;
    }
    const intra = sply === 'INTRA';
    out.push({
      sourceIndex: nextIdx++,
      pos,
      posLabel: posLabelFromCode(pos),
      sply_ty: sply || '—',
      sply_ty_label: intra ? 'Intra-State' : sply === 'INTER' ? 'Inter-State' : sply || '—',
      diff_percent: diff,
      itms,
    });
  }
  return out;
}

function sumAtTurnoverFromSection(section: unknown[]): number {
  let s = 0;
  for (const block of section) {
    if (!block || typeof block !== 'object') {
      continue;
    }
    const itms = (block as Record<string, unknown>)['itms'];
    if (!Array.isArray(itms)) {
      continue;
    }
    for (const line of itms) {
      if (!line || typeof line !== 'object') {
        continue;
      }
      const l = line as Record<string, unknown>;
      const det = (l['itm_det'] as Record<string, unknown> | undefined) ?? l;
      s +=
        num(det['ad_amt']) +
        num(det['iamt']) +
        num(det['camt']) +
        num(det['samt']) +
        num(det['csamt']);
    }
  }
  return s;
}

@Component({
  selector: 'lib-gstr1a-at-section-page',
  standalone: true,
  imports: [JsonPipe, RouterLink],
  templateUrl: './gstr1a-at-section.page.html',
  styleUrl: './gstr1a-at-section.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-[60vh]' },
})
export class Gstr1aAtSectionPageComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(Gstr1GstnOtpApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly authStore = inject(AuthStore);
  private readonly userProfile = inject(UserProfileRepository);

  readonly sectionHint =
    GSTR1A_DOWNLOAD_API_OPTIONS.find((x) => x.value === 'at')?.description ??
    'Tax liability (advances received)';

  readonly gstin = signal('');
  readonly retPeriod = signal('');
  readonly filingLabel = signal('');

  readonly filterQuery = signal('');
  readonly infoBannerDismissed = signal(false);
  readonly expandedRows = signal(new Set<number>());

  readonly viewState = signal<ViewState>('idle');
  readonly loading = signal(false);
  readonly httpError = signal<unknown>(null);
  readonly logicalErrorText = signal<string | null>(null);
  readonly rawResponse = signal<unknown>(null);
  readonly lastSyncedAt = signal<Date | null>(null);

  readonly atBlocks = signal<readonly Gstr1aAtBlockView[]>([]);

  readonly retsaveSubmitting = signal(false);
  readonly retsaveError = signal<unknown>(null);
  readonly retsaveSuccessPayload = signal<unknown>(null);

  readonly legalName = signal('');
  readonly tradeName = signal('');

  readonly fyLabel = computed(() => indianFyLabelFromMmYyyy(this.retPeriod().trim()));
  readonly taxPeriodLabel = computed(() => monthNameFromMmYyyy(this.retPeriod().trim()));

  readonly filteredBlocks = computed(() => {
    const q = this.filterQuery().trim().toLowerCase();
    const blocks = this.atBlocks();
    if (!q) {
      return blocks;
    }
    return blocks.filter(
      (b) =>
        b.pos.toLowerCase().includes(q) ||
        b.posLabel.toLowerCase().includes(q) ||
        b.sply_ty.toLowerCase().includes(q) ||
        b.sply_ty_label.toLowerCase().includes(q),
    );
  });

  readonly aggregateStats = computed(() => {
    let advance = 0;
    let igst = 0;
    let cgst = 0;
    let sgst = 0;
    let cess = 0;
    let rateRows = 0;
    for (const b of this.atBlocks()) {
      for (const it of b.itms) {
        rateRows += 1;
        advance += it.ad_amt;
        igst += it.iamt;
        cgst += it.camt;
        sgst += it.samt;
        cess += it.csamt;
      }
    }
    return {
      blockCount: this.atBlocks().length,
      rateRows,
      advance,
      igst,
      cgst,
      sgst,
      cess,
    };
  });

  readonly moneyFmt = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  readonly paramsValid = computed(() => {
    const g = this.gstin().trim();
    const r = this.retPeriod().trim();
    return g.length === 15 && RETURN_PERIOD_REGEX.test(r);
  });

  readonly canSubmitGstr1aRetsave = computed(() => {
    if (!this.paramsValid() || this.loading() || this.retsaveSubmitting()) {
      return false;
    }
    if (this.viewState() !== 'success') {
      return false;
    }
    return this.getRetsaveSectionForApi(this.rawResponse(), SECTION_API) !== null;
  });

  readonly backToGstr1aQueryParams = computed(() => ({
    gstin: this.gstin().trim().toUpperCase() || undefined,
    ret_period: this.retPeriod().trim() || undefined,
    api_name: SECTION_API,
    filing_status: this.filingLabel().trim() || undefined,
  }));

  readonly addStatewiseLink = computed((): readonly string[] => {
    const g = this.gstin().trim().toUpperCase();
    const r = this.retPeriod().trim();
    return ['/gstr1a/at', g, r, 'add-statewise'];
  });

  readonly addStatewiseQueryParams = computed(() => ({
    filing_status: this.filingLabel().trim() || undefined,
  }));

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

  blockTotals(b: Gstr1aAtBlockView): {
    advance: number;
    igst: number;
    cgst: number;
    sgst: number;
    cess: number;
  } {
    return b.itms.reduce(
      (acc, it) => ({
        advance: acc.advance + it.ad_amt,
        igst: acc.igst + it.iamt,
        cgst: acc.cgst + it.camt,
        sgst: acc.sgst + it.samt,
        cess: acc.cess + it.csamt,
      }),
      { advance: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 },
    );
  }

  toggleRow(i: number): void {
    const next = new Set(this.expandedRows());
    if (next.has(i)) {
      next.delete(i);
    } else {
      next.add(i);
    }
    this.expandedRows.set(next);
  }

  rowExpanded(i: number): boolean {
    return this.expandedRows().has(i);
  }

  dismissInfoBanner(): void {
    this.infoBannerDismissed.set(true);
  }

  openGstHelp(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    window.open('https://www.gst.gov.in/', '_blank', 'noopener,noreferrer');
  }

  async loadSection(): Promise<void> {
    if (!this.paramsValid()) {
      this.viewState.set('idle');
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
    this.atBlocks.set([]);
    this.expandedRows.set(new Set());
    this.infoBannerDismissed.set(false);

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

      const bucket = extractGstr1DownloadMessageArray(raw, SECTION_API);
      const blocks = parseAtBlocks(bucket);
      this.atBlocks.set(blocks);

      if (bucket.length === 0 || blocks.length === 0) {
        this.viewState.set('empty');
      } else {
        this.viewState.set('success');
      }
      this.lastSyncedAt.set(new Date());
    } catch (err: unknown) {
      this.httpError.set(normalizeErrorEnvelope(err));
      this.viewState.set('error');
    } finally {
      this.loading.set(false);
    }
  }

  formatMoney(n: number): string {
    return this.moneyFmt.format(n);
  }

  formatSynced(d: Date | null): string {
    if (!d) {
      return '—';
    }
    return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  }

  formatDiffPct(v: number | null): string {
    if (v === null || !Number.isFinite(v)) {
      return '—';
    }
    return `${(v * 100).toFixed(2).replace(/\.?0+$/, '')}%`;
  }

  async submitGstr1aRetsave(): Promise<void> {
    if (!this.canSubmitGstr1aRetsave()) {
      return;
    }
    const raw = this.rawResponse();
    const section = this.getRetsaveSectionForApi(raw, SECTION_API);
    if (section === null || !isGstr1DownloadSuccessEnvelope(raw)) {
      return;
    }

    const msg = raw.message as Record<string, unknown>;
    const arr = section as unknown[];
    const fallbackGt = sumAtTurnoverFromSection(arr);
    const gt = typeof msg['gt'] === 'number' ? msg['gt'] : fallbackGt;
    const curGt = typeof msg['cur_gt'] === 'number' ? msg['cur_gt'] : gt;

    const body: Record<string, unknown> = {
      fp: this.retPeriod().trim(),
      gstin: this.gstin().trim().toUpperCase(),
      gt,
      cur_gt: curGt,
      at: section,
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
    }
  }

  private getRetsaveSectionForApi(
    payload: unknown,
    apiName: Gstr1aDownloadApiName,
  ): unknown | null {
    if (!isGstr1DownloadSuccessEnvelope(payload)) {
      return null;
    }
    const msg = payload.message as Record<string, unknown>;
    const bucket = msg[apiName];
    if (bucket === undefined || bucket === null) {
      return null;
    }
    if (Array.isArray(bucket)) {
      return bucket.length > 0 ? bucket : null;
    }
    if (typeof bucket === 'object') {
      return Object.keys(bucket as object).length > 0 ? bucket : null;
    }
    return null;
  }

  async copyJson(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const raw = this.rawResponse();
    if (raw === null || raw === undefined) {
      return;
    }
    await navigator.clipboard.writeText(JSON.stringify(raw, null, 2));
  }

  downloadJson(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const raw = this.rawResponse();
    if (raw === null || raw === undefined) {
      return;
    }
    const blob = new Blob([JSON.stringify(raw, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gstr1a-at-${this.gstin()}-${this.retPeriod()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
