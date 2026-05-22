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

const SECTION_API: Gstr1aDownloadApiName = 'b2cs';

export interface Gstr1aB2csRowView {
  readonly pos: string;
  readonly posLabel: string;
  readonly sply_ty: string;
  readonly supplyLabel: string;
  readonly typ: string;
  readonly typLabel: string;
  readonly etin: string;
  readonly rt: number;
  readonly txval: number;
  readonly iamt: number;
  readonly camt: number;
  readonly samt: number;
  readonly csamt: number;
  readonly diff_percent: number | null;
}

const POS_LABEL = new Map(
  INDIAN_STATE_POS_OPTIONS.map((o) => [o.code, o.label] as const),
);

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

function parseB2csRows(bucket: unknown[]): Gstr1aB2csRowView[] {
  const out: Gstr1aB2csRowView[] = [];
  for (const item of bucket) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const r = item as Record<string, unknown>;
    const pos = String(r['pos'] ?? '').trim();
    const sply = String(r['sply_ty'] ?? '').trim().toUpperCase();
    const typ = String(r['typ'] ?? '').trim().toUpperCase();
    const diffRaw = r['diff_percent'];
    let diffPercent: number | null = null;
    if (typeof diffRaw === 'number' && Number.isFinite(diffRaw)) {
      diffPercent = diffRaw;
    } else if (diffRaw !== undefined && diffRaw !== null && String(diffRaw).trim() !== '') {
      const d = Number.parseFloat(String(diffRaw));
      diffPercent = Number.isFinite(d) ? d : null;
    }

    out.push({
      pos,
      posLabel: POS_LABEL.get(pos) ?? pos,
      sply_ty: sply,
      supplyLabel: sply === 'INTER' ? 'Inter-State' : sply === 'INTRA' ? 'Intra-State' : sply || '—',
      typ,
      typLabel:
        typ === 'E' ? 'E-commerce (E)' : typ === 'OE' ? 'Others (OE)' : typ ? typ : '—',
      etin: String(r['etin'] ?? '').trim().toUpperCase(),
      rt: num(r['rt']),
      txval: num(r['txval']),
      iamt: num(r['iamt']),
      camt: num(r['camt']),
      samt: num(r['samt']),
      csamt: num(r['csamt']),
      diff_percent: diffPercent,
    });
  }
  return out;
}

@Component({
  selector: 'lib-gstr1a-b2cs-section-page',
  standalone: true,
  imports: [JsonPipe, RouterLink],
  templateUrl: './gstr1a-b2cs-section.page.html',
  styleUrl: './gstr1a-b2cs-section.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-[60vh]' },
})
export class Gstr1aB2csSectionPageComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(Gstr1GstnOtpApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly authStore = inject(AuthStore);
  private readonly userProfile = inject(UserProfileRepository);

  readonly sectionHint =
    GSTR1A_DOWNLOAD_API_OPTIONS.find((x) => x.value === 'b2cs')?.description ??
    'B2C (small) others';

  readonly gstin = signal('');
  readonly retPeriod = signal('');
  readonly filingLabel = signal('');

  readonly filterQuery = signal('');
  readonly viewState = signal<ViewState>('idle');
  readonly loading = signal(false);
  readonly httpError = signal<unknown>(null);
  readonly logicalErrorText = signal<string | null>(null);
  readonly rawResponse = signal<unknown>(null);
  readonly lastSyncedAt = signal<Date | null>(null);

  readonly rows = signal<readonly Gstr1aB2csRowView[]>([]);

  readonly retsaveSubmitting = signal(false);
  readonly retsaveError = signal<unknown>(null);
  readonly retsaveSuccessPayload = signal<unknown>(null);

  readonly legalName = signal('');
  readonly tradeName = signal('');

  readonly fyLabel = computed(() => indianFyLabelFromMmYyyy(this.retPeriod().trim()));
  readonly taxPeriodLabel = computed(() => monthNameFromMmYyyy(this.retPeriod().trim()));

  readonly filteredRows = computed(() => {
    const q = this.filterQuery().trim().toLowerCase();
    const list = this.rows();
    if (!q) {
      return list;
    }
    return list.filter(
      (r) =>
        r.pos.toLowerCase().includes(q) ||
        r.posLabel.toLowerCase().includes(q) ||
        r.sply_ty.toLowerCase().includes(q) ||
        r.typ.toLowerCase().includes(q) ||
        r.etin.toLowerCase().includes(q) ||
        String(r.rt).includes(q),
    );
  });

  readonly aggregateStats = computed(() => {
    let txval = 0;
    let iamt = 0;
    let camt = 0;
    let samt = 0;
    let csamt = 0;
    for (const r of this.rows()) {
      txval += r.txval;
      iamt += r.iamt;
      camt += r.camt;
      samt += r.samt;
      csamt += r.csamt;
    }
    const n = this.rows().length;
    return {
      rowCount: n,
      txvalTotal: txval,
      iamtTotal: iamt,
      camtTotal: camt,
      samtTotal: samt,
      csamtTotal: csamt,
      taxTotal: iamt + camt + samt,
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

  readonly addRecordLink = computed((): readonly string[] => {
    const g = this.gstin().trim().toUpperCase();
    const r = this.retPeriod().trim();
    return ['/gstr1/workspace/gstr1-download/section', 'b2cs', g, r, 'add-b2cs'];
  });

  readonly addRecordQueryParams = computed(() => ({
    gstr1a: '1',
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
    this.rows.set([]);

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
      const parsed = parseB2csRows(bucket);
      this.rows.set(parsed);

      if (parsed.length === 0) {
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

  formatRatePercent(rt: number): string {
    return `${rt}%`;
  }

  formatDiffPercent(p: number | null): string {
    if (p === null) {
      return '—';
    }
    return `${p}%`;
  }

  formatSynced(d: Date | null): string {
    if (!d) {
      return '—';
    }
    return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
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
    const gt =
      typeof msg['gt'] === 'number' ? msg['gt'] : this.sumB2csTurnover(section);
    const curGt = typeof msg['cur_gt'] === 'number' ? msg['cur_gt'] : gt;

    const body: Record<string, unknown> = {
      fp: this.retPeriod().trim(),
      gstin: this.gstin().trim().toUpperCase(),
      gt,
      cur_gt: curGt,
      b2cs: section,
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
    raw: unknown,
    apiName: Gstr1aDownloadApiName,
  ): unknown | null {
    if (!isGstr1DownloadSuccessEnvelope(raw)) {
      return null;
    }
    const msg = raw.message as Record<string, unknown>;
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

  private sumB2csTurnover(section: unknown): number {
    if (!Array.isArray(section)) {
      return 0;
    }
    let s = 0;
    for (const row of section) {
      if (!row || typeof row !== 'object') {
        continue;
      }
      const r = row as Record<string, unknown>;
      s +=
        num(r['txval']) +
        num(r['iamt']) +
        num(r['camt']) +
        num(r['samt']) +
        num(r['csamt']);
    }
    return s;
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
    a.download = `gstr1a-b2cs-${this.gstin()}-${this.retPeriod()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
