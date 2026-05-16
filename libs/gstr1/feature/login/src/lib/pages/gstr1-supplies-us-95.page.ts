import { DecimalPipe, isPlatformBrowser } from '@angular/common';
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
import { FormBuilder, ReactiveFormsModule, type ValidatorFn } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  Gstr1GstnOtpApiService,
  RETURN_PERIOD_REGEX,
  coerceGstr1DownloadApiName,
  isGstr1DownloadSuccessEnvelope,
  type Gstr1DownloadApiName,
} from '@ramsoft-builder/gstr1/data-access/gstzen-auth';
import { firstValueFrom } from 'rxjs';
import {
  emptyUs95Drafts,
  readUs95DraftsFromJson,
  us95DraftsStorageKey,
  type Gstr1Us95DraftsState,
} from '../utils/gstr1-supplies-us-95.drafts';
import {
  mapUs95B2b,
  mapUs95B2c,
  mapUs95Urp2b,
  mapUs95Urp2c,
  type Us95B2bRow,
  type Us95B2cRow,
  type Us95Urp2bRow,
  type Us95Urp2cRow,
} from '../utils/gstr1-supplies-us-95.mapper';
import { INDIAN_STATE_POS_OPTIONS } from '../constants/indian-state-pos.options';
import { isIndianGstinFormat } from '../validators/indian-gstin.validator';

export type Us95TabId = 'rr' | 'rur' | 'urr' | 'urur';

type Us95Screen = 'list' | 'add';

const MONEY_REQ: ValidatorFn = (c) => {
  const v = String(c.value ?? '').trim();
  if (!v) {
    return { required: true };
  }
  return /^\d+(\.\d{1,2})?$/.test(v) ? null : { money: true };
};

const MONEY_OPT: ValidatorFn = (c) => {
  const v = String(c.value ?? '').trim();
  if (!v) {
    return null;
  }
  return /^\d+(\.\d{1,2})?$/.test(v) ? null : { money: true };
};

/** HTML `input[type=date]` value (`yyyy-mm-dd`) → NIC / GST JSON date (`dd-mm-yyyy`). */
function isoDateToDdMmYyyy(iso: string): string {
  const s = iso.trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) {
    return s;
  }
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function extractEcomBucket(
  raw: unknown,
  key: 'ecom' | 'ecoma',
): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || !isGstr1DownloadSuccessEnvelope(raw)) {
    return null;
  }
  const msg = (raw as Record<string, unknown>)['message'];
  if (!msg || typeof msg !== 'object') {
    return null;
  }
  const bucket = (msg as Record<string, unknown>)[key];
  if (bucket && typeof bucket === 'object' && !Array.isArray(bucket)) {
    return bucket as Record<string, unknown>;
  }
  return null;
}

@Component({
  selector: 'lib-gstr1-supplies-us-95-page',
  standalone: true,
  imports: [RouterLink, DecimalPipe, ReactiveFormsModule],
  templateUrl: './gstr1-supplies-us-95.page.html',
  styleUrl: './gstr1-supplies-us-95.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-[60vh]' },
})
export class Gstr1SuppliesUs95PageComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(Gstr1GstnOtpApiService);
  private readonly platformId = inject(PLATFORM_ID);

  /** GST state / UT codes for POS dropdowns (same list as other GSTR-1 forms). */
  readonly statePosOptions = INDIAN_STATE_POS_OPTIONS;

  readonly apiName = signal<Gstr1DownloadApiName>('supeco');
  readonly filerGstin = signal('');
  readonly retPeriod = signal('');
  readonly filingStatusLabel = signal('');
  readonly dueDateLabel = signal('');

  readonly tab = signal<Us95TabId>('rr');
  readonly screen = signal<Us95Screen>('list');
  readonly loading = signal(false);
  readonly httpError = signal<string | null>(null);

  readonly ecomBucket = signal<Record<string, unknown> | null>(null);
  readonly ecomaBucket = signal<Record<string, unknown> | null>(null);
  readonly drafts = signal<Gstr1Us95DraftsState>(emptyUs95Drafts());

  readonly rowsB2b = computed(() => [
    ...mapUs95B2b(this.ecomBucket(), this.ecomaBucket()),
    ...this.drafts().b2b,
  ]);
  readonly rowsB2c = computed(() => [
    ...mapUs95B2c(this.ecomBucket(), this.ecomaBucket()),
    ...this.drafts().b2c,
  ]);
  readonly rowsUrp2b = computed(() => [
    ...mapUs95Urp2b(this.ecomBucket(), this.ecomaBucket()),
    ...this.drafts().urp2b,
  ]);
  readonly rowsUrp2c = computed(() => [
    ...mapUs95Urp2c(this.ecomBucket(), this.ecomaBucket()),
    ...this.drafts().urp2c,
  ]);

  readonly currentRows = computed((): readonly (
    | Us95B2bRow
    | Us95B2cRow
    | Us95Urp2bRow
    | Us95Urp2cRow
  )[] => {
    switch (this.tab()) {
      case 'rr':
        return this.rowsB2b();
      case 'rur':
        return this.rowsB2c();
      case 'urr':
        return this.rowsUrp2b();
      case 'urur':
        return this.rowsUrp2c();
      default:
        return [];
    }
  });

  readonly addDetailSuffix = computed(() => {
    switch (this.tab()) {
      case 'rr':
        return 'B2B';
      case 'rur':
        return 'B2C';
      case 'urr':
        return 'URP2B';
      case 'urur':
        return 'URP2C';
      default:
        return '';
    }
  });

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
    o['api_name'] = 'supeco';
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

  readonly addForm = this.fb.group({
    rtin: [''],
    stin: [''],
    inum: [''],
    idt: [''],
    val: ['', MONEY_REQ],
    pos: [''],
    inv_typ: ['R'],
    sply_ty: ['INTER'],
    rt: [''],
    txval: ['', MONEY_REQ],
    iamt: ['0', MONEY_OPT],
    camt: ['0', MONEY_OPT],
    samt: ['0', MONEY_OPT],
    csamt: ['0', MONEY_OPT],
    flag: ['N'],
  });

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((pm) => {
      const api = coerceGstr1DownloadApiName(pm.get('apiName'));
      const g = (pm.get('gstin') ?? '').trim().toUpperCase();
      const rp = (pm.get('retPeriod') ?? '').trim();
      this.apiName.set(api);
      this.filerGstin.set(g);
      this.retPeriod.set(rp);
      if (api !== 'supeco' && api !== 'supecoa') {
        void this.router.navigate(['/gstr1/workspace/gstr1-download/section', api, g, rp], {
          replaceUrl: true,
          queryParamsHandling: 'preserve',
        });
        return;
      }
      this.screen.set('list');
      this.refreshDrafts();
      void this.loadEcomBuckets();
      this.resetAddForm();
    });

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((qm) => {
      this.filingStatusLabel.set((qm.get('filing_status') ?? '').trim());
      this.dueDateLabel.set((qm.get('due_date') ?? '').trim());
    });
  }

  paramsValid(): boolean {
    return (
      this.filerGstin().trim().length === 15 &&
      RETURN_PERIOD_REGEX.test(this.retPeriod().trim())
    );
  }

  trackB2b(_i: number, row: Us95B2bRow): string {
    return row.draftKey ?? `${row.kind}-${row.rtin}-${row.stin}-${row.inum}-${row.idt}`;
  }

  trackB2c(_i: number, row: Us95B2cRow): string {
    return row.draftKey ?? `${row.kind}-${row.stin}-${row.pos}-${row.rt}-${row.txval}`;
  }

  trackUrp2b(_i: number, row: Us95Urp2bRow): string {
    return row.draftKey ?? `${row.kind}-${row.rtin}-${row.inum}-${row.idt}`;
  }

  trackUrp2c(_i: number, row: Us95Urp2cRow): string {
    return row.draftKey ?? `${row.kind}-${row.pos}-${row.rt}-${row.txval}`;
  }

  selectTab(t: Us95TabId): void {
    if (this.screen() === 'add') {
      return;
    }
    this.tab.set(t);
  }

  openAddRecord(): void {
    if (!this.paramsValid()) {
      return;
    }
    this.resetAddForm();
    this.screen.set('add');
  }

  backFromAdd(): void {
    this.screen.set('list');
    this.resetAddForm();
  }

  resetAddForm(): void {
    this.addForm.reset({
      rtin: '',
      stin: '',
      inum: '',
      idt: '',
      val: '',
      pos: '',
      inv_typ: 'R',
      sply_ty: 'INTER',
      rt: '',
      txval: '',
      iamt: '0',
      camt: '0',
      samt: '0',
      csamt: '0',
      flag: 'N',
    });
  }

  deleteDraftRow(tabId: Us95TabId, draftKey: string | undefined): void {
    if (!draftKey) {
      return;
    }
    const cur = this.drafts();
    const next: Gstr1Us95DraftsState =
      tabId === 'rr'
        ? { ...cur, b2b: cur.b2b.filter((r) => r.draftKey !== draftKey) }
        : tabId === 'rur'
          ? { ...cur, b2c: cur.b2c.filter((r) => r.draftKey !== draftKey) }
          : tabId === 'urr'
            ? { ...cur, urp2b: cur.urp2b.filter((r) => r.draftKey !== draftKey) }
            : { ...cur, urp2c: cur.urp2c.filter((r) => r.draftKey !== draftKey) };
    this.persistDrafts(next);
  }

  saveAddRecord(): void {
    if (!this.paramsValid()) {
      return;
    }
    const t = this.tab();
    const f = this.addForm.getRawValue() as Record<string, string>;
    const parseMoney = (s: string): number => {
      const n = Number.parseFloat(String(s ?? '').trim());
      return Number.isFinite(n) ? n : NaN;
    };
    const dk = this.newDraftKey();
    const cur = this.drafts();

    if (t === 'rr') {
      const rtin = String(f['rtin'] ?? '').trim().toUpperCase();
      const stin = String(f['stin'] ?? '').trim().toUpperCase();
      if (!isIndianGstinFormat(rtin) || !isIndianGstinFormat(stin)) {
        this.addForm.markAllAsTouched();
        return;
      }
      const inum = String(f['inum'] ?? '').trim();
      const idtIso = String(f['idt'] ?? '').trim();
      const idGst = isoDateToDdMmYyyy(idtIso);
      const pos = String(f['pos'] ?? '').trim();
      if (!inum || !idtIso || !pos) {
        this.addForm.markAllAsTouched();
        return;
      }
      const val = parseMoney(f['val'] ?? '');
      const txval = parseMoney(f['txval'] ?? '');
      if (!Number.isFinite(val) || !Number.isFinite(txval)) {
        this.addForm.markAllAsTouched();
        return;
      }
      const row: Us95B2bRow = {
        kind: 'Draft',
        draftKey: dk,
        rtin,
        stin,
        inum,
        idt: idGst,
        val,
        pos,
        invTyp: String(f['inv_typ'] ?? '').trim() || 'R',
        splyTy: String(f['sply_ty'] ?? '').trim() || 'INTER',
        rt: String(f['rt'] ?? '').trim(),
        txval,
        iamt: parseMoney(f['iamt'] ?? '0') || 0,
        camt: parseMoney(f['camt'] ?? '0') || 0,
        samt: parseMoney(f['samt'] ?? '0') || 0,
        csamt: parseMoney(f['csamt'] ?? '0') || 0,
        origInum: '',
        origIdt: '',
      };
      this.persistDrafts({ ...cur, b2b: [...cur.b2b, row] });
    } else if (t === 'rur') {
      const stin = String(f['stin'] ?? '').trim().toUpperCase();
      if (!isIndianGstinFormat(stin)) {
        this.addForm.markAllAsTouched();
        return;
      }
      const pos = String(f['pos'] ?? '').trim();
      const rt = String(f['rt'] ?? '').trim();
      const txval = parseMoney(f['txval'] ?? '');
      if (!pos || !rt || !Number.isFinite(txval)) {
        this.addForm.markAllAsTouched();
        return;
      }
      const row: Us95B2cRow = {
        kind: 'Draft',
        draftKey: dk,
        stin,
        ostin: '',
        pos,
        omon: '',
        splyTy: String(f['sply_ty'] ?? '').trim() || 'INTER',
        rt,
        txval,
        iamt: parseMoney(f['iamt'] ?? '0') || 0,
        camt: parseMoney(f['camt'] ?? '0') || 0,
        samt: parseMoney(f['samt'] ?? '0') || 0,
        csamt: parseMoney(f['csamt'] ?? '0') || 0,
        flag: String(f['flag'] ?? '').trim() || 'N',
      };
      this.persistDrafts({ ...cur, b2c: [...cur.b2c, row] });
    } else if (t === 'urr') {
      const rtin = String(f['rtin'] ?? '').trim().toUpperCase();
      if (!isIndianGstinFormat(rtin)) {
        this.addForm.markAllAsTouched();
        return;
      }
      const inum = String(f['inum'] ?? '').trim();
      const idtIso = String(f['idt'] ?? '').trim();
      const idGst = isoDateToDdMmYyyy(idtIso);
      const pos = String(f['pos'] ?? '').trim();
      if (!inum || !idtIso || !pos) {
        this.addForm.markAllAsTouched();
        return;
      }
      const val = parseMoney(f['val'] ?? '');
      const txval = parseMoney(f['txval'] ?? '');
      if (!Number.isFinite(val) || !Number.isFinite(txval)) {
        this.addForm.markAllAsTouched();
        return;
      }
      const row: Us95Urp2bRow = {
        kind: 'Draft',
        draftKey: dk,
        rtin,
        inum,
        idt: idGst,
        val,
        pos,
        invTyp: String(f['inv_typ'] ?? '').trim() || 'R',
        splyTy: String(f['sply_ty'] ?? '').trim() || 'INTER',
        rt: String(f['rt'] ?? '').trim(),
        txval,
        iamt: parseMoney(f['iamt'] ?? '0') || 0,
        camt: parseMoney(f['camt'] ?? '0') || 0,
        samt: parseMoney(f['samt'] ?? '0') || 0,
        csamt: parseMoney(f['csamt'] ?? '0') || 0,
        origInum: '',
        origIdt: '',
      };
      this.persistDrafts({ ...cur, urp2b: [...cur.urp2b, row] });
    } else {
      const pos = String(f['pos'] ?? '').trim();
      const rt = String(f['rt'] ?? '').trim();
      const txval = parseMoney(f['txval'] ?? '');
      if (!pos || !rt || !Number.isFinite(txval)) {
        this.addForm.markAllAsTouched();
        return;
      }
      const row: Us95Urp2cRow = {
        kind: 'Draft',
        draftKey: dk,
        pos,
        omon: '',
        splyTy: String(f['sply_ty'] ?? '').trim() || 'INTER',
        rt,
        txval,
        iamt: parseMoney(f['iamt'] ?? '0') || 0,
        camt: parseMoney(f['camt'] ?? '0') || 0,
        samt: parseMoney(f['samt'] ?? '0') || 0,
        csamt: parseMoney(f['csamt'] ?? '0') || 0,
        flag: String(f['flag'] ?? '').trim() || 'N',
      };
      this.persistDrafts({ ...cur, urp2c: [...cur.urp2c, row] });
    }

    this.screen.set('list');
    this.resetAddForm();
  }

  async loadEcomBuckets(): Promise<void> {
    if (!this.paramsValid()) {
      this.ecomBucket.set(null);
      this.ecomaBucket.set(null);
      this.httpError.set(null);
      return;
    }
    this.loading.set(true);
    this.httpError.set(null);
    const g = this.filerGstin().trim().toUpperCase();
    const rp = this.retPeriod().trim();
    try {
      const [rawEcom, rawEcoma] = await Promise.all([
        firstValueFrom(
          this.api.downloadGstr1Return({
            gstin: g,
            ret_period: rp,
            api_name: 'ecom',
          }),
        ),
        firstValueFrom(
          this.api.downloadGstr1Return({
            gstin: g,
            ret_period: rp,
            api_name: 'ecoma',
          }),
        ),
      ]);
      const bad: string[] = [];
      if (!isGstr1DownloadSuccessEnvelope(rawEcom)) {
        this.ecomBucket.set(null);
        bad.push('ecom');
      } else {
        this.ecomBucket.set(extractEcomBucket(rawEcom, 'ecom'));
      }
      if (!isGstr1DownloadSuccessEnvelope(rawEcoma)) {
        this.ecomaBucket.set(null);
        bad.push('ecoma');
      } else {
        this.ecomaBucket.set(extractEcomBucket(rawEcoma, 'ecoma'));
      }
      if (bad.length === 2) {
        this.httpError.set('Neither ecom nor ecoma download returned success.');
      } else if (bad.length === 1) {
        this.httpError.set(
          `${bad[0]} did not return success · amendment rows for that bucket may be missing.`,
        );
      } else {
        this.httpError.set(null);
      }
    } catch {
      this.ecomBucket.set(null);
      this.ecomaBucket.set(null);
      this.httpError.set('Failed to load ecom / ecoma sections.');
    } finally {
      this.loading.set(false);
    }
  }

  openGstHelp(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    window.open('https://www.gst.gov.in/', '_blank', 'noopener,noreferrer');
  }

  private newDraftKey(): string {
    if (
      isPlatformBrowser(this.platformId) &&
      typeof crypto !== 'undefined' &&
      typeof crypto.randomUUID === 'function'
    ) {
      return `draft-${crypto.randomUUID()}`;
    }
    return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  private refreshDrafts(): void {
    if (!this.paramsValid()) {
      this.drafts.set(emptyUs95Drafts());
      return;
    }
    if (!isPlatformBrowser(this.platformId)) {
      this.drafts.set(emptyUs95Drafts());
      return;
    }
    try {
      const raw = sessionStorage.getItem(
        us95DraftsStorageKey(this.filerGstin().trim().toUpperCase(), this.retPeriod().trim()),
      );
      if (!raw) {
        this.drafts.set(emptyUs95Drafts());
        return;
      }
      const parsed = readUs95DraftsFromJson(raw);
      this.drafts.set(parsed ?? emptyUs95Drafts());
    } catch {
      this.drafts.set(emptyUs95Drafts());
    }
  }

  private persistDrafts(next: Gstr1Us95DraftsState): void {
    this.drafts.set(next);
    if (!this.paramsValid() || !isPlatformBrowser(this.platformId)) {
      return;
    }
    try {
      sessionStorage.setItem(
        us95DraftsStorageKey(this.filerGstin().trim().toUpperCase(), this.retPeriod().trim()),
        JSON.stringify(next),
      );
    } catch {
      /* quota */
    }
  }
}
