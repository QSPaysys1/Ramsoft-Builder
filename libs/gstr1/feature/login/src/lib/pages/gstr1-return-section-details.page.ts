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
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  type ValidatorFn,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  Gstr1GstnOtpApiService,
  RETURN_PERIOD_REGEX,
  coerceGstr1DownloadApiName,
  extractGstr1DownloadMessageArray,
  isGstr1DownloadSuccessEnvelope,
  type Gstr1DownloadApiName,
} from '@ramsoft-builder/gstr1/data-access/gstzen-auth';
import { firstValueFrom } from 'rxjs';
import { portalSectionTitleForApi } from '../constants/gstr1-download-workspace.constants';
import { Gstr1SectionRecordsTableComponent } from '../components/gstr1-section-records-table/gstr1-section-records-table.component';
import type {
  Gstr1SectionDetailRow,
  Gstr1SectionUiKind,
} from '../models/gstr1-return-section.model';
import { uiKindForDownloadApi } from '../models/gstr1-return-section.model';
import { indianGstinValidator } from '../validators/indian-gstin.validator';
import {
  mapEwbRowsToSectionRows,
  parseEwbImportPayload,
} from '../utils/gstr1-ewb-to-section.mapper';
import { mapBucketToSectionRows } from '../utils/gstr1-section-detail-rows.mapper';

type ViewState = 'idle' | 'loading' | 'success' | 'empty' | 'error';

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

const GST_FACE_DATE: ValidatorFn = (c) => {
  const v = (c.value as string | null | undefined)?.trim();
  if (!v) {
    return null;
  }
  const ok = /^\d{2}[/-]\d{2}[/-]\d{4}$/.test(v);
  return ok ? null : { gstDate: true };
};

const OPTIONAL_MONEY = Validators.pattern(/^$|^\d+(\.\d{1,2})?$/);

@Component({
  selector: 'lib-gstr1-return-section-details-page',
  standalone: true,
  imports: [
    JsonPipe,
    RouterLink,
    ReactiveFormsModule,
    Gstr1SectionRecordsTableComponent,
  ],
  templateUrl: './gstr1-return-section-details.page.html',
  styleUrl: './gstr1-return-section-details.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-[60vh]' },
})
export class Gstr1ReturnSectionDetailsPageComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(Gstr1GstnOtpApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly apiName = signal<Gstr1DownloadApiName>('b2b');
  readonly gstin = signal('');
  readonly retPeriod = signal('');
  readonly filingStatusLabel = signal('');
  readonly dueDateLabel = signal('');

  readonly portalTitle = computed(() => portalSectionTitleForApi(this.apiName()));
  readonly uiKind = computed(() => uiKindForDownloadApi(this.apiName()));
  /** B2B / e-invoice B2B tiles open full-page retsave form. */
  readonly isB2bRetsaveWorkspace = computed(() => {
    const a = this.apiName();
    return a === 'b2b' || a === 'b2b-einv';
  });

  /** B2C (Large) uses NIC-style `b2cl` retsave bucket — full-page form like B2B (no recipient GSTIN). */
  readonly isB2clRetsaveWorkspace = computed(() => this.apiName() === 'b2cl');

  /** 6A Exports — portal-style full-page add (`exp` / `exp-einv`). */
  readonly isExpRetsaveWorkspace = computed(() => {
    const a = this.apiName();
    return a === 'exp' || a === 'exp-einv';
  });

  /** B2C (small) — NIC-style flat `b2cs[]` line on full-page form. */
  readonly isB2csRetsaveWorkspace = computed(() => this.apiName() === 'b2cs');

  /** 9B CDNR — `cdnr[]` retsave bucket (registered credit/debit notes). */
  readonly isCdnrRetsaveWorkspace = computed(() => {
    const a = this.apiName();
    return a === 'cdnr' || a === 'cdnr-einv';
  });

  /** 9B CDNUR — `cdnur[]` retsave bucket (credit/debit notes — unregistered). */
  readonly isCdnurRetsaveWorkspace = computed(() => {
    const a = this.apiName();
    return a === 'cdnur' || a === 'cdnur-einv';
  });

  /** 11A — `at[]` tax liability on advances (state-wise POS block). */
  readonly isAtRetsaveWorkspace = computed(() => this.apiName() === 'at');

  /** 11B — `txpd[]` adjustment of advances (state-wise POS block). */
  readonly isTxpRetsaveWorkspace = computed(() => this.apiName() === 'txp');

  /** Primary action label on the section toolbar (11A/11B use NIC wording). */
  readonly addRecordPrimaryLabel = computed(() =>
    this.apiName() === 'at' || this.apiName() === 'txp' ? 'Add statewise details' : 'Add Record',
  );

  readonly viewState = signal<ViewState>('idle');
  readonly loading = signal(false);
  readonly httpError = signal<unknown>(null);
  readonly logicalErrorText = signal<string | null>(null);
  readonly rawResponse = signal<unknown>(null);

  readonly apiRows = signal<readonly Gstr1SectionDetailRow[]>([]);
  readonly localRows = signal<readonly Gstr1SectionDetailRow[]>([]);
  readonly ewbRows = signal<readonly Gstr1SectionDetailRow[]>([]);

  readonly ewbImportJson = signal('');
  readonly ewbImportLoading = signal(false);
  readonly ewbImportError = signal<string | null>(null);
  readonly showEwbPanel = signal(false);

  readonly filterInvoice = signal('');
  readonly filterGstin = signal('');
  readonly filterDate = signal('');

  readonly expandedRowIds = signal(new Set<string>());

  readonly addModalOpen = signal(false);

  readonly mergedRows = computed(() => [
    ...this.apiRows(),
    ...this.localRows(),
    ...this.ewbRows(),
  ]);

  readonly filteredRows = computed(() => {
    const qInv = this.filterInvoice().trim().toLowerCase();
    const qGst = this.filterGstin().trim().toLowerCase();
    const qDt = this.filterDate().trim().toLowerCase();
    return this.mergedRows().filter((r) => {
      if (qInv && !r.invoiceNo.toLowerCase().includes(qInv)) {
        return false;
      }
      if (qGst && !r.ctin.toLowerCase().includes(qGst)) {
        return false;
      }
      if (qDt && !r.invoiceDate.toLowerCase().includes(qDt)) {
        return false;
      }
      return true;
    });
  });

  readonly totals = computed(() => {
    const rows = this.filteredRows();
    let taxable = 0;
    let igst = 0;
    let cgst = 0;
    let sgst = 0;
    let cess = 0;
    for (const r of rows) {
      taxable += r.taxableTotal;
      igst += r.igst;
      cgst += r.cgst;
      sgst += r.sgst;
      cess += r.cess;
    }
    const tax = igst + cgst + sgst + cess;
    return {
      count: rows.length,
      taxable,
      igst,
      cgst,
      sgst,
      cess,
      tax,
      invoiceValue: rows.reduce((a, r) => a + (r.invoiceValue ?? r.taxableTotal), 0),
    };
  });

  readonly recordForm = this.fb.group({
    ctin: ['', [indianGstinValidator]],
    invoiceNo: ['', Validators.required],
    invoiceDate: ['', [Validators.required, GST_FACE_DATE]],
    pos: [''],
    invoiceValue: ['', OPTIONAL_MONEY],
    taxableTotal: ['', [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
    igst: ['0', OPTIONAL_MONEY],
    cgst: ['0', OPTIONAL_MONEY],
    sgst: ['0', OPTIONAL_MONEY],
    cess: ['0', OPTIONAL_MONEY],
    irn: [''],
    shippingBillNo: [''],
    portCode: [''],
    exportType: [''],
    gstPayment: [''],
    noteNumber: [''],
    noteDate: [''],
    noteType: [''],
    rate: ['', OPTIONAL_MONEY],
    hsnCode: [''],
    quantity: ['', OPTIONAL_MONEY],
    uqc: [''],
    description: [''],
  });

  readonly moneyFmt = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  readonly formatMoneyFn = (n: number): string => this.moneyFmt.format(n);

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((pm) => {
      const api = coerceGstr1DownloadApiName(pm.get('apiName'));
      const g = (pm.get('gstin') ?? '').trim().toUpperCase();
      const rp = (pm.get('retPeriod') ?? '').trim();
      this.apiName.set(api);
      this.gstin.set(g);
      this.retPeriod.set(rp);
      this.localRows.set([]);
      this.ewbRows.set([]);
      this.expandedRowIds.set(new Set());
      this.apiRows.set([]);
      this.viewState.set('idle');
      void this.syncQueryLabelsAndFetch();
    });

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((qm) => {
      this.filingStatusLabel.set((qm.get('filing_status') ?? '').trim());
      this.dueDateLabel.set((qm.get('due_date') ?? '').trim());
    });
  }

  formatMoney(n: number): string {
    return this.moneyFmt.format(n);
  }

  backQueryParams(): Record<string, string> {
    const o: Record<string, string> = {};
    const g = this.gstin().trim();
    const r = this.retPeriod().trim();
    if (g) {
      o['gstin'] = g;
    }
    if (r) {
      o['ret_period'] = r;
    }
    o['api_name'] = this.apiName();
    const fs = this.filingStatusLabel().trim();
    const dd = this.dueDateLabel().trim();
    if (fs) {
      o['filing_status'] = fs;
    }
    if (dd) {
      o['due_date'] = dd;
    }
    return o;
  }

  paramsValid(): boolean {
    return (
      this.gstin().trim().length === 15 &&
      RETURN_PERIOD_REGEX.test(this.retPeriod().trim()) &&
      this.apiName() !== 'retsum'
    );
  }

  private async syncQueryLabelsAndFetch(): Promise<void> {
    const q = this.route.snapshot.queryParamMap;
    this.filingStatusLabel.set((q.get('filing_status') ?? '').trim());
    this.dueDateLabel.set((q.get('due_date') ?? '').trim());
    if (!this.paramsValid()) {
      this.logicalErrorText.set(
        this.apiName() === 'retsum'
          ? 'Pick a data section (not RETSUM) to open this workspace.'
          : 'Invalid GSTIN or return period in the URL.',
      );
      this.viewState.set('error');
      return;
    }
    await this.fetchSection();
  }

  async fetchSection(): Promise<void> {
    if (this.loading()) {
      return;
    }
    this.loading.set(true);
    this.viewState.set('loading');
    this.httpError.set(null);
    this.logicalErrorText.set(null);

    try {
      const raw = await firstValueFrom(
        this.api.downloadGstr1Return({
          gstin: this.gstin().trim().toUpperCase(),
          ret_period: this.retPeriod().trim(),
          api_name: this.apiName(),
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

      const bucket = extractGstr1DownloadMessageArray(raw, this.apiName());
      if (bucket.length === 0) {
        this.apiRows.set([]);
        this.viewState.set('empty');
        return;
      }

      this.apiRows.set(mapBucketToSectionRows(this.apiName(), bucket));
      this.viewState.set('success');
    } catch (err: unknown) {
      this.httpError.set(normalizeErrorEnvelope(err));
      this.logicalErrorText.set('Section download failed.');
      this.viewState.set('error');
    } finally {
      this.loading.set(false);
    }
  }

  toggleExpand(rowId: string): void {
    const next = new Set(this.expandedRowIds());
    if (next.has(rowId)) {
      next.delete(rowId);
    } else {
      next.add(rowId);
    }
    this.expandedRowIds.set(next);
  }

  openGstHelp(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    window.open('https://www.gst.gov.in/', '_blank', 'noopener,noreferrer');
  }

  scrollTop(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  openAddRecord(): void {
    if (this.isB2bRetsaveWorkspace()) {
      void this.router.navigate(
        [
          '/gstr1/workspace/gstr1-download/section',
          this.apiName(),
          this.gstin().trim().toUpperCase(),
          this.retPeriod().trim(),
          'add-b2b',
        ],
        {
          queryParams: {
            filing_status: this.filingStatusLabel().trim() || undefined,
            due_date: this.dueDateLabel().trim() || undefined,
          },
        },
      );
      return;
    }
    if (this.isB2clRetsaveWorkspace()) {
      void this.router.navigate(
        [
          '/gstr1/workspace/gstr1-download/section',
          this.apiName(),
          this.gstin().trim().toUpperCase(),
          this.retPeriod().trim(),
          'add-b2cl',
        ],
        {
          queryParams: {
            filing_status: this.filingStatusLabel().trim() || undefined,
            due_date: this.dueDateLabel().trim() || undefined,
          },
        },
      );
      return;
    }
    if (this.isExpRetsaveWorkspace()) {
      void this.router.navigate(
        [
          '/gstr1/workspace/gstr1-download/section',
          this.apiName(),
          this.gstin().trim().toUpperCase(),
          this.retPeriod().trim(),
          'add-exp',
        ],
        {
          queryParams: {
            filing_status: this.filingStatusLabel().trim() || undefined,
            due_date: this.dueDateLabel().trim() || undefined,
          },
        },
      );
      return;
    }
    if (this.isB2csRetsaveWorkspace()) {
      void this.router.navigate(
        [
          '/gstr1/workspace/gstr1-download/section',
          this.apiName(),
          this.gstin().trim().toUpperCase(),
          this.retPeriod().trim(),
          'add-b2cs',
        ],
        {
          queryParams: {
            filing_status: this.filingStatusLabel().trim() || undefined,
            due_date: this.dueDateLabel().trim() || undefined,
          },
        },
      );
      return;
    }
    if (this.isCdnrRetsaveWorkspace()) {
      void this.router.navigate(
        [
          '/gstr1/workspace/gstr1-download/section',
          this.apiName(),
          this.gstin().trim().toUpperCase(),
          this.retPeriod().trim(),
          'add-cdnr',
        ],
        {
          queryParams: {
            filing_status: this.filingStatusLabel().trim() || undefined,
            due_date: this.dueDateLabel().trim() || undefined,
          },
        },
      );
      return;
    }
    if (this.isCdnurRetsaveWorkspace()) {
      void this.router.navigate(
        [
          '/gstr1/workspace/gstr1-download/section',
          this.apiName(),
          this.gstin().trim().toUpperCase(),
          this.retPeriod().trim(),
          'add-cdnur',
        ],
        {
          queryParams: {
            filing_status: this.filingStatusLabel().trim() || undefined,
            due_date: this.dueDateLabel().trim() || undefined,
          },
        },
      );
      return;
    }
    if (this.isAtRetsaveWorkspace()) {
      void this.router.navigate(
        [
          '/gstr1/workspace/gstr1-download/section',
          this.apiName(),
          this.gstin().trim().toUpperCase(),
          this.retPeriod().trim(),
          'add-at-statewise',
        ],
        {
          queryParams: {
            filing_status: this.filingStatusLabel().trim() || undefined,
            due_date: this.dueDateLabel().trim() || undefined,
          },
        },
      );
      return;
    }
    if (this.isTxpRetsaveWorkspace()) {
      void this.router.navigate(
        [
          '/gstr1/workspace/gstr1-download/section',
          this.apiName(),
          this.gstin().trim().toUpperCase(),
          this.retPeriod().trim(),
          'add-txpd-statewise',
        ],
        {
          queryParams: {
            filing_status: this.filingStatusLabel().trim() || undefined,
            due_date: this.dueDateLabel().trim() || undefined,
          },
        },
      );
      return;
    }
    this.openAddModal();
  }

  openAddModal(): void {
    this.recordForm.reset({
      ctin: '',
      invoiceNo: '',
      invoiceDate: '',
      pos: '',
      invoiceValue: '',
      taxableTotal: '',
      igst: '0',
      cgst: '0',
      sgst: '0',
      cess: '0',
      irn: '',
      shippingBillNo: '',
      portCode: '',
      exportType: '',
      gstPayment: '',
      noteNumber: '',
      noteDate: '',
      noteType: '',
      rate: '',
      hsnCode: '',
      quantity: '',
      uqc: '',
      description: '',
    });
    const kind = this.uiKind();
    if (kind === 'b2cl' || kind === 'b2cs') {
      this.recordForm.get('ctin')?.clearValidators();
      this.recordForm.get('invoiceNo')?.setValidators([Validators.required]);
      this.recordForm.get('pos')?.setValidators([Validators.required]);
    } else if (kind === 'hsn') {
      this.recordForm.get('invoiceNo')?.clearValidators();
      this.recordForm.get('invoiceDate')?.clearValidators();
      this.recordForm.get('hsnCode')?.setValidators([Validators.required]);
      this.recordForm.get('taxableTotal')?.setValidators([
        Validators.required,
        Validators.pattern(/^\d+(\.\d{1,2})?$/),
      ]);
    } else if (kind === 'exp') {
      this.recordForm.get('ctin')?.clearValidators();
      this.recordForm.get('invoiceNo')?.setValidators([Validators.required]);
    } else if (kind === 'cdnur') {
      this.recordForm.get('ctin')?.clearValidators();
      this.recordForm.get('invoiceNo')?.clearValidators();
      this.recordForm.get('invoiceDate')?.clearValidators();
      this.recordForm.get('noteNumber')?.setValidators([Validators.required]);
      this.recordForm.get('noteDate')?.setValidators([Validators.required, GST_FACE_DATE]);
    } else if (kind === 'cdnr') {
      this.recordForm.get('invoiceNo')?.clearValidators();
      this.recordForm.get('invoiceDate')?.clearValidators();
      this.recordForm.get('ctin')?.setValidators([Validators.required, indianGstinValidator]);
      this.recordForm.get('noteNumber')?.setValidators([Validators.required]);
      this.recordForm.get('noteDate')?.setValidators([Validators.required, GST_FACE_DATE]);
    } else {
      this.recordForm.get('invoiceNo')?.setValidators([Validators.required]);
      this.recordForm.get('invoiceDate')?.setValidators([Validators.required, GST_FACE_DATE]);
      this.recordForm.get('ctin')?.setValidators([Validators.required, indianGstinValidator]);
      this.recordForm.get('pos')?.clearValidators();
    }
    ['ctin', 'invoiceNo', 'invoiceDate', 'pos', 'hsnCode', 'noteNumber', 'noteDate'].forEach((k) =>
      this.recordForm.get(k)?.updateValueAndValidity({ emitEvent: false }),
    );
    this.addModalOpen.set(true);
  }

  closeAddModal(): void {
    this.addModalOpen.set(false);
  }

  saveLocalRecord(): void {
    if (this.recordForm.invalid) {
      this.recordForm.markAllAsTouched();
      return;
    }
    const v = this.recordForm.getRawValue() as Record<string, string>;
    const kind = this.uiKind();
    const parseNum = (s: string): number => {
      const n = Number.parseFloat((s ?? '').trim());
      return Number.isFinite(n) ? n : 0;
    };
    const taxable = parseNum(v['taxableTotal'] ?? '0');
    const igst = parseNum(v['igst'] ?? '0');
    const cgst = parseNum(v['cgst'] ?? '0');
    const sgst = parseNum(v['sgst'] ?? '0');
    const cess = parseNum(v['cess'] ?? '0');
    let invoiceNo = (v['invoiceNo'] ?? '').trim() || (v['hsnCode'] ?? '').trim() || 'NEW';
    let invoiceDate = (v['invoiceDate'] ?? '').trim() || '—';
    if (kind === 'cdnr' || kind === 'cdnur') {
      invoiceNo = (v['noteNumber'] ?? '').trim() || invoiceNo;
      invoiceDate = (v['noteDate'] ?? '').trim() || invoiceDate;
    }
    const row: Gstr1SectionDetailRow = {
      rowId: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ctin: (v['ctin'] ?? '').trim().toUpperCase() || '—',
      invoiceNo,
      invoiceDate,
      invoiceValue: v['invoiceValue']?.trim() ? parseNum(v['invoiceValue']) : null,
      taxableTotal: taxable,
      igst,
      cgst,
      sgst,
      cess,
      pos: (v['pos'] ?? '').trim(),
      reverseCharge: '',
      irn: (v['irn'] ?? '').trim(),
      gstPayment: v['gstPayment']?.trim() || undefined,
      shippingBillNo: v['shippingBillNo']?.trim() || undefined,
      portCode: v['portCode']?.trim().toUpperCase() || undefined,
      exportType: v['exportType']?.trim() || undefined,
      noteNumber: v['noteNumber']?.trim() || undefined,
      noteDate: v['noteDate']?.trim() || undefined,
      noteType: v['noteType']?.trim() || undefined,
      rate: v['rate']?.trim() ? parseNum(v['rate']) : undefined,
      hsnCode: v['hsnCode']?.trim() || undefined,
      quantity: v['quantity']?.trim() ? parseNum(v['quantity']) : undefined,
      uqc: v['uqc']?.trim() || undefined,
      description: v['description']?.trim() || undefined,
      items: [
        {
          lineLabel: 'Draft line',
          taxableValue: taxable,
          igst,
          cgst,
          sgst,
          cess,
        },
      ],
      source: 'local',
      statusLabel: 'Draft',
    };

    this.localRows.update((cur) => [...cur, row]);
    this.addModalOpen.set(false);
  }

  toggleEwbPanel(): void {
    this.showEwbPanel.update((v) => !v);
  }

  parseEwbImport(): void {
    const rawText = this.ewbImportJson().trim();
    if (!rawText) {
      this.ewbImportError.set('Paste or upload JSON first.');
      return;
    }
    this.ewbImportLoading.set(true);
    this.ewbImportError.set(null);
    try {
      const parsed = JSON.parse(rawText) as unknown;
      const ewbs = parseEwbImportPayload(parsed);
      if (ewbs.length === 0) {
        this.ewbImportError.set('No e-way bill rows found in JSON.');
        this.ewbRows.set([]);
      } else {
        this.ewbRows.set(mapEwbRowsToSectionRows(this.apiName(), ewbs));
      }
    } catch {
      this.ewbImportError.set('Invalid JSON — fix syntax and try again.');
      this.ewbRows.set([]);
    } finally {
      this.ewbImportLoading.set(false);
    }
  }

  onEwbFile(ev: Event): void {
    const inputEl = ev.target as HTMLInputElement;
    const file = inputEl.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = (): void => {
      const t = typeof reader.result === 'string' ? reader.result : '';
      this.ewbImportJson.set(t);
    };
    reader.readAsText(file);
    inputEl.value = '';
  }

  exportCsv(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const rows = this.filteredRows();
    const kind = this.uiKind();
    const headers =
      kind === 'hsn'
        ? ['HSN', 'Description', 'Qty', 'UQC', 'Taxable', 'IGST', 'CGST', 'SGST', 'Cess', 'Source']
        : kind === 'exp'
          ? [
              'InvoiceNo',
              'InvoiceDate',
              'GstPayment',
              'InvoiceValue',
              'Taxable',
              'IGST',
              'Cess',
              'ShippingBill',
              'Port',
              'ExportType',
              'Source',
            ]
          : [
              'GSTIN',
              'InvoiceNo',
              'InvoiceDate',
              'POS',
              'Taxable',
              'IGST',
              'CGST',
              'SGST',
              'Cess',
              'Source',
            ];

    const esc = (c: string): string => {
      if (/[",\n]/.test(c)) {
        return `"${c.replace(/"/g, '""')}"`;
      }
      return c;
    };

    const lines = [headers.join(',')];
    for (const r of rows) {
      const vals =
        kind === 'hsn'
          ? [
              r.hsnCode ?? r.invoiceNo,
              r.description ?? '',
              String(r.quantity ?? ''),
              r.uqc ?? '',
              String(r.taxableTotal),
              String(r.igst),
              String(r.cgst),
              String(r.sgst),
              String(r.cess),
              r.source,
            ]
          : kind === 'exp'
            ? [
                r.invoiceNo,
                r.invoiceDate,
                r.gstPayment ?? '',
                String(r.invoiceValue ?? ''),
                String(r.taxableTotal),
                String(r.igst),
                String(r.cess),
                r.shippingBillNo ?? '',
                r.portCode ?? '',
                r.exportType ?? '',
                r.source,
              ]
            : [
                r.ctin,
                r.invoiceNo,
                r.invoiceDate,
                r.pos,
                String(r.taxableTotal),
                String(r.igst),
                String(r.cgst),
                String(r.sgst),
                String(r.cess),
                r.source,
              ];
      lines.push(vals.map((x) => esc(String(x))).join(','));
    }

    const blob = new Blob(['\ufeff' + lines.join('\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gstr1-${this.apiName()}-${this.gstin()}-${this.retPeriod()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
    a.download = `gstr1-${this.apiName()}-${this.gstin()}-${this.retPeriod()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  showModalFields(kind: Gstr1SectionUiKind): 'b2b' | 'b2c' | 'exp' | 'hsn' | 'cdn' {
    if (kind === 'hsn') {
      return 'hsn';
    }
    if (kind === 'exp') {
      return 'exp';
    }
    if (kind === 'cdnr' || kind === 'cdnur') {
      return 'cdn';
    }
    if (kind === 'b2cl' || kind === 'b2cs') {
      return 'b2c';
    }
    return 'b2b';
  }
}
