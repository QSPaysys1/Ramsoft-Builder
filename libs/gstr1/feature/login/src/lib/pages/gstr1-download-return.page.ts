import { isPlatformBrowser, JsonPipe } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  HostListener,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { AuthToastService } from '@ramsoft-builder/auth/ui/login';
import { AuthStore } from '@ramsoft-builder/auth/data-access/auth';
import { UserProfileRepository } from '@ramsoft-builder/e-invoices/data-access/einvoice';
import {
  Gstr1GstnOtpApiService,
  RETURN_PERIOD_REGEX,
  coerceGstr1DownloadApiName,
  extractGstr1RetsumSecSum,
  isGstr1DownloadSuccessEnvelope,
  mapGstr1RetsumSecSumToPortalTileCounts,
  retsumSecSumHasRowForSecNames,
  sumGstr1RetsumTtlRecForSecNames,
  isGstr1ProceedToFileResetSuccess,
  type Gstr1DownloadApiName,
} from '@ramsoft-builder/gstr1/data-access/gstzen-auth';
import { filter } from 'rxjs/operators';
import { catchError, firstValueFrom, of, switchMap } from 'rxjs';
import {
  GSTR1_AMEND_RECORD_DETAIL_TILES,
  GSTR1_SECTION_CARD_PRIMARY_API,
  GSTR1_SUMMARY_SECTION_TITLES,
  GSTR1_SUMMARY_TILES_FOR_API,
  type Gstr1AmendRecordDetailTile,
} from '../constants/gstr1-download-workspace.constants';
import { GSTR1_NIL_RESAVE_INV_ORDER } from '../constants/gstr1-nil-supplies.constants';
import { normalizeGstzenHttpError, gstzenUserFacingMessage } from '@ramsoft-builder/gstr1/utils/http-error';
import { docIssueStorageKey } from '../utils/gstr1-doc-issue.state';
import { ecoSuppliesStorageKey } from '../utils/gstr1-eco-supplies.state';
import { us95DraftsStorageKey } from '../utils/gstr1-supplies-us-95.drafts';

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

/** Zero-value NIC `nil.inv` payload for File Nil GSTR-1 → FILE STATEMENT. */
function buildZeroNilRetsavePayload(
  gstin: string,
  retPeriod: string,
): Record<string, unknown> {
  const inv: Record<string, unknown>[] = GSTR1_NIL_RESAVE_INV_ORDER.map(({ sply_ty }) => ({
    sply_ty,
    expt_amt: 0,
    nil_amt: 0,
    ngsup_amt: 0,
  }));
  return {
    fp: retPeriod.trim(),
    gstin: gstin.trim().toUpperCase(),
    gt: 0,
    cur_gt: 0,
    nil: { inv },
  };
}

@Component({
  selector: 'lib-gstr1-download-return-page',
  standalone: true,
  imports: [JsonPipe, RouterLink],
  templateUrl: './gstr1-download-return.page.html',
  styleUrl: './gstr1-download-return.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-[60vh]' },
})
export class Gstr1DownloadReturnPageComponent {
  @HostListener('document:keydown.escape', ['$event'])
  onEscapeResetModal(event: Event): void {
    if (!this.resetConfirmOpen()) {
      return;
    }
    event.preventDefault();
    this.cancelResetConfirm();
  }

  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(Gstr1GstnOtpApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authStore = inject(AuthStore);
  private readonly userProfile = inject(UserProfileRepository);
  private readonly toast = inject(AuthToastService);

  readonly summaryTitles = GSTR1_SUMMARY_SECTION_TITLES;
  /** Exposed for template bindings (portal tile → primary `api_name`). */
  readonly sectionCardPrimaryApis = GSTR1_SECTION_CARD_PRIMARY_API;
  readonly amendRecordTiles = GSTR1_AMEND_RECORD_DETAIL_TILES;

  readonly gstin = signal('');
  readonly retPeriod = signal('');
  readonly apiName = signal<Gstr1DownloadApiName>('b2b');
  /** Return filing status label from dashboard / query. */
  readonly filingStatusLabel = signal('');
  /** Due date label (query `due_date`); not supplied by download API. */
  readonly dueDateLabel = signal('');

  readonly legalName = signal('');
  readonly tradeName = signal('');

  readonly fileNilGstr1 = signal(false);
  readonly addRecordOpen = signal(true);
  readonly amendRecordOpen = signal(false);
  readonly eInvoiceHistoryOpen = signal(false);
  readonly resetConfirmOpen = signal(false);

  readonly retsumLoading = signal(false);
  /** Last successful RETSUM `sec_sum` payload (for amend-tile counts by `EXPA`, `B2BA`, …). */
  readonly retsumSecSum = signal<readonly unknown[]>([]);
  readonly retsumTileCounts = signal<number[] | null>(null);
  readonly httpError = signal<unknown>(null);
  readonly rawResponse = signal<unknown>(null);
  readonly logicalErrorText = signal<string | null>(null);

  readonly proceedToFileLoading = signal(false);

  readonly fyLabel = computed(() => indianFyLabelFromMmYyyy(this.retPeriod().trim()));
  readonly taxPeriodLabel = computed(() => monthNameFromMmYyyy(this.retPeriod().trim()));

  readonly summaryCounts = computed(() => {
    const cached = this.retsumTileCounts();
    if (cached && cached.length === this.summaryTitles.length) {
      return cached;
    }
    return this.summaryTitles.map(() => 0);
  });

  constructor() {
    this.syncQueryIntoSignals(this.route.snapshot.queryParamMap);

    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.syncQueryIntoSignals(this.route.snapshot.queryParamMap);
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

    afterNextRender(() => {
      const runAutoFetch = (): void => {
        const g = this.gstin().trim().toUpperCase();
        const r = this.retPeriod().trim();
        if (RETURN_PERIOD_REGEX.test(r) && g.length === 15) {
          void this.bootstrapFetch();
        }
      };
      runAutoFetch();
    });
  }

  private syncQueryIntoSignals(q: { get: (k: string) => string | null }): void {
    const g = (q.get('gstin') ?? '').trim().toUpperCase();
    const r = (q.get('ret_period') ?? '').trim();
    const apiParam = q.get('api_name');
    const filing = (q.get('filing_status') ?? '').trim();
    const due = (q.get('due_date') ?? '').trim();
    if (g) {
      this.gstin.set(g);
    }
    if (r) {
      this.retPeriod.set(r);
    }
    if (apiParam !== null && apiParam.trim() !== '') {
      this.apiName.set(coerceGstr1DownloadApiName(apiParam));
    }
    if (filing) {
      this.filingStatusLabel.set(filing);
    }
    if (due) {
      this.dueDateLabel.set(due);
    }
  }

  updateGstin(value: string): void {
    this.gstin.set(value.trim().toUpperCase());
  }

  updateRetPeriod(value: string): void {
    this.retPeriod.set(value.trim());
  }

  toggleAddRecordSection(): void {
    this.addRecordOpen.update((v) => !v);
  }

  toggleAmendSection(): void {
    this.amendRecordOpen.update((v) => !v);
  }

  toggleEInvoiceHistorySection(): void {
    this.eInvoiceHistoryOpen.update((v) => !v);
  }

  toggleFileNil(): void {
    this.fileNilGstr1.update((v) => {
      const next = !v;
      if (next) {
        this.logicalErrorText.set(null);
        this.httpError.set(null);
      } else {
        void this.fetchRetsumSummary();
      }
      return next;
    });
  }

  resetDisabled(): boolean {
    return this.fileNilGstr1();
  }

  primaryActionLabel(): string {
    return this.fileNilGstr1() ? 'File statement' : 'Proceed to file / Summary';
  }

  summaryTileActive(index: number): boolean {
    const primary = GSTR1_SECTION_CARD_PRIMARY_API[index];
    return !!primary && primary === this.apiName();
  }

  /** Highlight tiles using amendment buckets too (matches RETSUM mapping). */
  summaryTileActiveExtended(index: number): boolean {
    const indices = GSTR1_SUMMARY_TILES_FOR_API[this.apiName()];
    return indices?.includes(index) ?? this.summaryTileActive(index);
  }

  /**
   * NIL (8A–8D) tile: portal-style grid + retsave JSON while return is not filed; after filing, open downloaded section workspace.
   */
  nilTileUsesRetsaveGrid(): boolean {
    return this.filingStatusLabel().trim().toLowerCase() !== 'filed';
  }

  navigateToSection(index: number): void {
    const primary = GSTR1_SECTION_CARD_PRIMARY_API[index];
    if (!primary) {
      return;
    }
    void this.openSectionWorkspace(primary);
  }

  navigateToAmendRecordTile(tile: Gstr1AmendRecordDetailTile): void {
    if (!this.paramsValid() || this.fileNilGstr1() || this.retsumLoading()) {
      return;
    }
    void this.openSectionWorkspace(tile.amendApi);
  }

  amendRecordTileDisabled(): boolean {
    return this.retsumLoading() || this.fileNilGstr1() || !this.paramsValid();
  }

  amendRecordTileHint(tile: Gstr1AmendRecordDetailTile): string {
    return `Open ${tile.amendApi} workspace`;
  }

  amendRecordTileCount(tile: Gstr1AmendRecordDetailTile): number {
    const secSum = this.retsumSecSum();
    if (retsumSecSumHasRowForSecNames(secSum, tile.retsumSecNames)) {
      return sumGstr1RetsumTtlRecForSecNames(secSum, tile.retsumSecNames);
    }
    const counts = this.summaryCounts();
    return counts[tile.primaryTileIndex] ?? 0;
  }

  resetWorkspace(): void {
    this.fileNilGstr1.set(false);
    this.httpError.set(null);
    this.logicalErrorText.set(null);
    this.rawResponse.set(null);
    this.retsumSecSum.set([]);
    this.retsumTileCounts.set(null);
    this.syncQueryIntoSignals(this.route.snapshot.queryParamMap);
  }

  openResetConfirm(): void {
    this.resetConfirmOpen.set(true);
  }

  cancelResetConfirm(): void {
    this.resetConfirmOpen.set(false);
  }

  /** User confirmed reset — clear browser drafts, RETSUM cache, sync from URL. */
  confirmResetWorkspace(): void {
    this.clearSessionDraftsForCurrentReturn();
    this.resetWorkspace();
    this.resetConfirmOpen.set(false);
    this.toast.show(
      'success',
      'Saved data has been cleared. Press View to reload return summary.',
      5500,
    );
  }

  private clearSessionDraftsForCurrentReturn(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const g = this.gstin().trim().toUpperCase();
    const r = this.retPeriod().trim();
    if (g.length !== 15 || !RETURN_PERIOD_REGEX.test(r)) {
      return;
    }
    const keys = [
      docIssueStorageKey(g, r),
      ecoSuppliesStorageKey(g, r),
      us95DraftsStorageKey(g, r),
    ];
    try {
      for (const k of keys) {
        sessionStorage.removeItem(k);
      }
    } catch {
      /* quota / private mode */
    }
  }

  async proceedToFileSummary(): Promise<void> {
    if (this.fileNilGstr1()) {
      await this.fileNilStatement();
      return;
    }
    await this.runProceedToFileFlow({ nilRetsaveFirst: false });
  }

  /** Portal “FILE STATEMENT” — post zero `nil` retsave, then proceed to file. */
  async fileNilStatement(): Promise<void> {
    if (!this.fileNilGstr1()) {
      return;
    }
    await this.runProceedToFileFlow({ nilRetsaveFirst: true });
  }

  downloadEInvoiceExcel(): void {
    this.toast.show(
      'info',
      'E-invoice Excel download is not available in this workspace yet.',
      4500,
    );
  }

  private async runProceedToFileFlow(opts: {
    readonly nilRetsaveFirst: boolean;
  }): Promise<void> {
    if (this.proceedToFileLoading()) {
      return;
    }
    if (!this.paramsValid()) {
      this.toast.show(
        'error',
        'Enter a valid 15-character GSTIN and return period (MMYYYY) before proceeding.',
        5500,
      );
      return;
    }
    this.proceedToFileLoading.set(true);
    try {
      const g = this.gstin().trim().toUpperCase();
      const r = this.retPeriod().trim();

      if (opts.nilRetsaveFirst) {
        await firstValueFrom(
          this.api.retsaveGstr1Return(buildZeroNilRetsavePayload(g, r)),
        );
      }

      const raw = await firstValueFrom(
        this.api.resetGstr1Proceed({
          gstin: g,
          ret_period: r,
        }),
      );
      if (!isGstr1ProceedToFileResetSuccess(raw)) {
        const fromApi =
          gstzenUserFacingMessage(raw) ??
          (() => {
            if (!raw || typeof raw !== 'object') {
              return null;
            }
            const st = String((raw as Record<string, unknown>)['status'] ?? '?');
            return `GSTR‑1 proceed returned status ${st}.`;
          })();
        this.toast.show('error', fromApi ?? 'GSTR‑1 proceed response was not recognized.', 6500);
        return;
      }

      const refId = raw.message.reference_id.trim();
      void this.router.navigate(['/gstr1/workspace/returns-dashboard'], {
        queryParams: {
          gstin: g || undefined,
          ret_period: r || undefined,
          gstr1_reference_id: refId || undefined,
        },
      });
    } catch (err: unknown) {
      const normalized = normalizeGstzenHttpError(err);
      let detail = opts.nilRetsaveFirst
        ? 'Nil GSTR‑1 file statement failed.'
        : 'GSTR‑1 proceed request failed.';
      if (normalized && typeof normalized === 'object') {
        const body = (normalized as { body?: unknown }).body;
        const fromBody = gstzenUserFacingMessage(body);
        if (fromBody) {
          detail = fromBody;
        } else if (typeof body === 'string' && body.trim()) {
          detail = body.trim();
        }
      }
      this.toast.show('error', detail, 6500);
    } finally {
      this.proceedToFileLoading.set(false);
    }
  }

  private openSectionWorkspace(api: Gstr1DownloadApiName): void {
    if (!this.paramsValid() || this.fileNilGstr1() || this.retsumLoading()) {
      return;
    }
    const g = this.gstin().trim().toUpperCase();
    const r = this.retPeriod().trim();
    const qp = {
      filing_status: this.filingStatusLabel().trim() || undefined,
      due_date: this.dueDateLabel().trim() || undefined,
    };

    if (api === 'nil' && this.nilTileUsesRetsaveGrid()) {
      void this.router.navigate(
        ['/gstr1/workspace/gstr1-download/section', api, g, r, 'add-nil'],
        { queryParams: qp },
      );
      return;
    }
    if (api === 'hsnsum') {
      void this.router.navigate(
        ['/gstr1/workspace/gstr1-download/section', api, g, r, 'add-hsn'],
        { queryParams: qp },
      );
      return;
    }
    if (api === 'doc_issue') {
      void this.router.navigate(
        ['/gstr1/workspace/gstr1-download/section', 'doc_issue', g, r, 'documents-issued'],
        { queryParams: qp },
      );
      return;
    }
    if (api === 'ecoma') {
      void this.router.navigate(
        ['/gstr1/workspace/gstr1-download/section', 'ecoma', g, r, 'amend-ecoma'],
        { queryParams: qp },
      );
      return;
    }
    if (api === 'ecom') {
      void this.router.navigate(
        ['/gstr1/workspace/gstr1-download/section', 'ecom', g, r, 'supplies-eco'],
        { queryParams: qp },
      );
      return;
    }
    if (api === 'supecoa') {
      void this.router.navigate(
        ['/gstr1/workspace/gstr1-download/section', 'supecoa', g, r, 'amend-supecoa'],
        { queryParams: qp },
      );
      return;
    }
    if (api === 'supeco') {
      void this.router.navigate(
        ['/gstr1/workspace/gstr1-download/section', 'supeco', g, r, 'supplies-us-95'],
        { queryParams: qp },
      );
      return;
    }
    if (api === 'b2ba') {
      void this.router.navigate(
        ['/gstr1/workspace/gstr1-download/section', api, g, r, 'amend-b2b'],
        { queryParams: qp },
      );
      return;
    }
    if (api === 'b2cla') {
      void this.router.navigate(
        ['/gstr1/workspace/gstr1-download/section', api, g, r, 'amend-b2cla'],
        { queryParams: qp },
      );
      return;
    }
    if (api === 'expa') {
      void this.router.navigate(
        ['/gstr1/workspace/gstr1-download/section', api, g, r, 'amend-exp'],
        { queryParams: qp },
      );
      return;
    }
    if (api === 'cdnra') {
      void this.router.navigate(
        ['/gstr1/workspace/gstr1-download/section', api, g, r, 'amend-cdnra'],
        { queryParams: qp },
      );
      return;
    }
    if (api === 'cdnura') {
      void this.router.navigate(
        ['/gstr1/workspace/gstr1-download/section', api, g, r, 'amend-cdnura'],
        { queryParams: qp },
      );
      return;
    }
    if (api === 'b2csa') {
      void this.router.navigate(
        ['/gstr1/workspace/gstr1-download/section', api, g, r, 'amend-b2csa'],
        { queryParams: qp },
      );
      return;
    }
    if (api === 'ata') {
      void this.router.navigate(
        ['/gstr1/workspace/gstr1-download/section', api, g, r, 'amend-ata'],
        { queryParams: qp },
      );
      return;
    }
    if (api === 'txpa') {
      void this.router.navigate(
        ['/gstr1/workspace/gstr1-download/section', api, g, r, 'amend-txpa'],
        { queryParams: qp },
      );
      return;
    }
    this.apiName.set(api);
    void this.router.navigate(['/gstr1/workspace/gstr1-download/section', api, g, r], {
      queryParams: qp,
    });
  }

  openEInvoiceAdvisory(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    window.open('https://einvoice1.gst.gov.in/', '_blank', 'noopener,noreferrer');
  }

  openGstHelp(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    window.open('https://www.gst.gov.in/', '_blank', 'noopener,noreferrer');
  }

  paramsValid(): boolean {
    const g = this.gstin().trim();
    const r = this.retPeriod().trim();
    return g.length === 15 && RETURN_PERIOD_REGEX.test(r);
  }

  /** First paint: RETSUM tile counts only — detailed sections open on their own route. */
  async bootstrapFetch(): Promise<void> {
    await this.fetchRetsumSummary();
  }

  /** GSTZen `retsum` → portal tile counts (`sec_sum`). Returns whether RETSUM succeeded. */
  async fetchRetsumSummary(): Promise<boolean> {
    if (this.retsumLoading()) {
      return false;
    }
    if (!this.paramsValid()) {
      this.logicalErrorText.set('Enter a valid 15-character GSTIN and return period (MMYYYY).');
      this.httpError.set(null);
      return false;
    }
    if (this.fileNilGstr1()) {
      return false;
    }

    this.retsumLoading.set(true);
    this.httpError.set(null);
    this.logicalErrorText.set(null);

    try {
      this.syncUrlFromForm();

      const raw = await firstValueFrom(
        this.api.downloadGstr1Return({
          gstin: this.gstin().trim().toUpperCase(),
          ret_period: this.retPeriod().trim(),
          api_name: 'retsum',
        }),
      );

      if (!isGstr1DownloadSuccessEnvelope(raw)) {
        const st =
          raw && typeof raw === 'object' && 'status' in (raw as object)
            ? String((raw as Record<string, unknown>)['status'])
            : '?';
        let msg = `RETSUM did not return success (status = ${st}).`;
        if (
          raw &&
          typeof raw === 'object' &&
          'message' in (raw as object) &&
          typeof (raw as { message?: unknown }).message === 'string'
        ) {
          msg = (raw as { message: string }).message;
        }
        this.logicalErrorText.set(msg);
        return false;
      }

      const secSum = extractGstr1RetsumSecSum(raw);
      this.retsumSecSum.set(secSum);
      this.retsumTileCounts.set(mapGstr1RetsumSecSumToPortalTileCounts(secSum));
      this.rawResponse.set(raw);
      return true;
    } catch (err: unknown) {
      this.httpError.set(normalizeGstzenHttpError(err));
      this.logicalErrorText.set('RETSUM request failed.');
      return false;
    } finally {
      this.retsumLoading.set(false);
    }
  }

  refresh(): void {
    void this.fetchRetsumSummary();
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
    const slug =
      extractGstr1RetsumSecSum(raw).length > 0 ? 'retsum' : this.apiName();
    a.download = `gstr1-${slug}-${this.gstin()}-${this.retPeriod()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  syncUrlFromForm(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        gstin: this.gstin().trim().toUpperCase() || undefined,
        ret_period: this.retPeriod().trim() || undefined,
        api_name: this.apiName(),
        filing_status: this.filingStatusLabel().trim() || undefined,
        due_date: this.dueDateLabel().trim() || undefined,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
