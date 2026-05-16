import { isPlatformBrowser, JsonPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  Gstr1GstnOtpApiService,
  RETURN_PERIOD_REGEX,
  coerceGstr1DownloadApiName,
  type Gstr1DownloadApiName,
} from '@ramsoft-builder/gstr1/data-access/gstzen-auth';
import { firstValueFrom } from 'rxjs';
import { GSTR1_DOCUMENTS_ISSUED_SECTIONS } from '../constants/gstr1-documents-issued.constants';
import {
  appendDocRow,
  buildRetsaveDocIssuePayload,
  docIssueStorageKey,
  emptyDocIssueState,
  removeDocRow,
  rowsForDocType,
  updateDocRow,
  type Gstr1DocIssueRow,
  type Gstr1DocIssueState,
} from '../utils/gstr1-doc-issue.state';

@Component({
  selector: 'lib-gstr1-documents-issued-page',
  standalone: true,
  imports: [JsonPipe, RouterLink],
  templateUrl: './gstr1-documents-issued.page.html',
  styleUrl: './gstr1-documents-issued.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-[60vh]' },
})
export class Gstr1DocumentsIssuedPageComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(Gstr1GstnOtpApiService);

  readonly apiName = signal<Gstr1DownloadApiName>('doc_issue');
  readonly filerGstin = signal('');
  readonly retPeriod = signal('');
  readonly filingStatusLabel = signal('');
  readonly dueDateLabel = signal('');

  readonly sections = GSTR1_DOCUMENTS_ISSUED_SECTIONS;

  readonly docState = signal<Gstr1DocIssueState>(emptyDocIssueState());

  readonly saveSubmitting = signal(false);
  readonly saveError = signal<unknown>(null);
  readonly saveSuccessPayload = signal<unknown>(null);
  readonly requestPayloadJson = signal<string>('');

  readonly backQueryParams = computed(() => {
    const o: Record<string, string> = {};
    const g = this.filerGstin().trim();
    const r = this.retPeriod().trim();
    if (g) {
      o['gstin'] = g;
    }
    if (r) {
      o['ret_period'] = r;
    }
    o['api_name'] = 'doc_issue';
    const fs = this.filingStatusLabel().trim();
    const dd = this.dueDateLabel().trim();
    if (fs) {
      o['filing_status'] = fs;
    }
    if (dd) {
      o['due_date'] = dd;
    }
    return o;
  });

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((pm) => {
      const api = coerceGstr1DownloadApiName(pm.get('apiName'));
      const g = (pm.get('gstin') ?? '').trim().toUpperCase();
      const rp = (pm.get('retPeriod') ?? '').trim();
      this.apiName.set(api);
      this.filerGstin.set(g);
      this.retPeriod.set(rp);
      if (api !== 'doc_issue') {
        void this.router.navigate(['/gstr1/workspace/gstr1-download/section', api, g, rp], {
          replaceUrl: true,
          queryParamsHandling: 'preserve',
        });
        return;
      }
      void this.hydrateState();
    });

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((qm) => {
      this.filingStatusLabel.set((qm.get('filing_status') ?? '').trim());
      this.dueDateLabel.set((qm.get('due_date') ?? '').trim());
    });
  }

  rows(docNum: number): readonly Gstr1DocIssueRow[] {
    return rowsForDocType(this.docState(), docNum);
  }

  paramsValid(): boolean {
    return (
      this.filerGstin().trim().length === 15 &&
      RETURN_PERIOD_REGEX.test(this.retPeriod().trim())
    );
  }

  refreshPayloadPreview(): void {
    const p = this.buildRetsavePayload();
    this.requestPayloadJson.set(
      p
        ? JSON.stringify(p, null, 2)
        : '// Add at least one document line to preview retsave JSON.',
    );
  }

  private buildRetsavePayload(): Record<string, unknown> | null {
    if (!this.paramsValid()) {
      return null;
    }
    const s = this.docState();
    if (s.doc_det.length === 0) {
      return null;
    }
    return buildRetsaveDocIssuePayload(this.retPeriod(), this.filerGstin(), s);
  }

  /** GSTZen does not support `api_name=doc_issue` on download — load draft from session only. */
  hydrateState(): void {
    if (!this.paramsValid()) {
      this.docState.set(emptyDocIssueState());
      this.refreshPayloadPreview();
      return;
    }
    const g = this.filerGstin().trim().toUpperCase();
    const rp = this.retPeriod().trim();
    const local = this.readStorage(g, rp) ?? emptyDocIssueState();
    this.docState.set(local);
    this.refreshPayloadPreview();
  }

  private readStorage(gstin: string, retPeriod: string): Gstr1DocIssueState | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    try {
      const raw = sessionStorage.getItem(docIssueStorageKey(gstin, retPeriod));
      if (!raw) {
        return null;
      }
      const o = JSON.parse(raw) as unknown;
      if (!o || typeof o !== 'object' || !Array.isArray((o as { doc_det?: unknown }).doc_det)) {
        return null;
      }
      return { doc_det: (o as Gstr1DocIssueState).doc_det };
    } catch {
      return null;
    }
  }

  private writeStorage(gstin: string, retPeriod: string, state: Gstr1DocIssueState): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    try {
      sessionStorage.setItem(docIssueStorageKey(gstin, retPeriod), JSON.stringify(state));
    } catch {
      /* ignore quota */
    }
  }

  persistLocal(state: Gstr1DocIssueState): void {
    this.docState.set(state);
    if (this.paramsValid()) {
      this.writeStorage(this.filerGstin().trim().toUpperCase(), this.retPeriod().trim(), state);
    }
    this.refreshPayloadPreview();
  }

  openAddDocument(docNum: number): void {
    if (!this.paramsValid()) {
      return;
    }
    const next = appendDocRow(this.docState(), docNum, {
      from: '',
      to: '',
      totnum: 0,
      cancel: 0,
      net_issue: 0,
    });
    this.persistLocal(next);
  }

  patchRow(
    docNum: number,
    rowNum: number,
    field: 'from' | 'to' | 'totnum' | 'cancel',
    raw: string,
  ): void {
    const s = this.docState();
    const row = rowsForDocType(s, docNum).find((x) => x.num === rowNum);
    if (!row) {
      return;
    }
    let from = row.from;
    let to = row.to;
    let totnum = row.totnum;
    let cancel = row.cancel;
    if (field === 'from') {
      from = raw;
    } else if (field === 'to') {
      to = raw;
    } else if (field === 'totnum') {
      const t = String(raw).trim();
      totnum = t === '' ? 0 : Math.max(0, Number.parseInt(t, 10) || 0);
    } else {
      const t = String(raw).trim();
      cancel = t === '' ? 0 : Math.max(0, Number.parseInt(t, 10) || 0);
    }
    const net_issue = Math.max(0, totnum - cancel);
    const next = updateDocRow(s, docNum, rowNum, { from, to, totnum, cancel, net_issue });
    this.persistLocal(next);
  }

  deleteRow(docNum: number, rowNum: number): void {
    const next = removeDocRow(this.docState(), docNum, rowNum);
    this.persistLocal(next);
  }

  openGstHelp(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    window.open('https://www.gst.gov.in/', '_blank', 'noopener,noreferrer');
  }

  async submitRetsave(): Promise<void> {
    if (!this.paramsValid()) {
      return;
    }
    const payload = this.buildRetsavePayload();
    if (!payload) {
      return;
    }
    this.saveSubmitting.set(true);
    this.saveError.set(null);
    this.saveSuccessPayload.set(null);
    try {
      const res = await firstValueFrom(this.api.retsaveGstr1Return(payload));
      this.saveSuccessPayload.set(res);
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse) {
        let body = err.error;
        if (typeof body === 'string') {
          try {
            body = JSON.parse(body) as unknown;
          } catch {
            /* keep */
          }
        }
        this.saveError.set({
          status: err.status,
          statusText: err.statusText,
          body,
        });
      } else {
        this.saveError.set({ message: err instanceof Error ? err.message : String(err) });
      }
    } finally {
      this.saveSubmitting.set(false);
    }
  }
}
