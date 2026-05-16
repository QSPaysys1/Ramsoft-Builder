import { DecimalPipe, isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
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
  RETURN_PERIOD_REGEX,
  coerceGstr1DownloadApiName,
  type Gstr1DownloadApiName,
} from '@ramsoft-builder/gstr1/data-access/gstzen-auth';
import { firstValueFrom } from 'rxjs';
import {
  emptyEcoSuppliesState,
  ecoSuppliesStorageKey,
  type Gstr1EcoSuppliesState,
  type Gstr1EcoSupplyRow,
  type Gstr1EcoSupplyTab,
} from '../utils/gstr1-eco-supplies.state';
import { fetchGstinTaxpayerDisplayNames$ } from '../utils/gstin-search-taxpayer.utils';
import { indianGstinValidator, isIndianGstinFormat } from '../validators/indian-gstin.validator';

type EcoScreen = 'list' | 'add';

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

@Component({
  selector: 'lib-gstr1-eco-supplies-page',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, DecimalPipe],
  templateUrl: './gstr1-eco-supplies.page.html',
  styleUrl: './gstr1-eco-supplies.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-[60vh]' },
})
export class Gstr1EcoSuppliesPageComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);

  readonly apiName = signal<Gstr1DownloadApiName>('ecom');
  readonly filerGstin = signal('');
  readonly retPeriod = signal('');
  readonly filingStatusLabel = signal('');
  readonly dueDateLabel = signal('');

  readonly ecoTab = signal<Gstr1EcoSupplyTab>('tcs');
  readonly screen = signal<EcoScreen>('list');

  readonly state = signal<Gstr1EcoSuppliesState>(emptyEcoSuppliesState());

  readonly gstinLookupLoading = signal(false);

  readonly addForm = this.fb.group({
    ecoGstin: ['', [Validators.required, indianGstinValidator]],
    tradeLegal: [{ value: '', disabled: true }, [Validators.required]],
    netVal: ['', [MONEY_REQ]],
    igst: ['', [MONEY_REQ]],
    cgst: ['', [MONEY_REQ]],
    sgst: ['', [MONEY_REQ]],
    cess: ['', [MONEY_OPT]],
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
  });

  readonly currentRows = computed(() => {
    const s = this.state();
    return this.ecoTab() === 'tcs' ? s.tcs : s.ninefive;
  });

  readonly addDetailTitleSuffix = computed(() =>
    this.ecoTab() === 'tcs' ? 'u/s 52 (TCS)' : 'u/s 9(5)',
  );

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((pm) => {
      const api = coerceGstr1DownloadApiName(pm.get('apiName'));
      const g = (pm.get('gstin') ?? '').trim().toUpperCase();
      const rp = (pm.get('retPeriod') ?? '').trim();
      this.apiName.set(api);
      this.filerGstin.set(g);
      this.retPeriod.set(rp);
      if (api !== 'ecom' && api !== 'ecoma') {
        void this.router.navigate(['/gstr1/workspace/gstr1-download/section', api, g, rp], {
          replaceUrl: true,
          queryParamsHandling: 'preserve',
        });
        return;
      }
      this.refreshDrafts();
      this.screen.set('list');
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

  selectTab(tab: Gstr1EcoSupplyTab): void {
    if (this.screen() === 'add') {
      return;
    }
    this.ecoTab.set(tab);
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
      ecoGstin: '',
      tradeLegal: '',
      netVal: '',
      igst: '',
      cgst: '',
      sgst: '',
      cess: '',
    });
    const tl = this.addForm.get('tradeLegal');
    tl?.disable({ emitEvent: false });
    tl?.setValidators([Validators.required]);
    tl?.setValue('');
    tl?.updateValueAndValidity({ emitEvent: false });
    this.gstinLookupLoading.set(false);
  }

  async onEcoGstinBlur(): Promise<void> {
    const raw = String(this.addForm.get('ecoGstin')?.value ?? '').trim().toUpperCase();
    const ctl = this.addForm.get('tradeLegal');
    if (!ctl) {
      return;
    }
    if (!isIndianGstinFormat(raw)) {
      ctl.setValue('');
      ctl.disable({ emitEvent: false });
      ctl.setValidators([Validators.required]);
      ctl.updateValueAndValidity({ emitEvent: false });
      return;
    }
    this.gstinLookupLoading.set(true);
    try {
      const names = await firstValueFrom(fetchGstinTaxpayerDisplayNames$(this.http, raw));
      const label =
        names?.tradeNam || names?.lgnm
          ? [names.tradeNam, names.lgnm].filter(Boolean).join(' — ')
          : '';
      if (label) {
        ctl.setValue(label);
        ctl.disable({ emitEvent: false });
      } else {
        ctl.setValue('');
        ctl.enable({ emitEvent: false });
      }
      ctl.setValidators([Validators.required]);
      ctl.updateValueAndValidity({ emitEvent: false });
    } finally {
      this.gstinLookupLoading.set(false);
    }
  }

  async saveAddRecord(): Promise<void> {
    if (!this.paramsValid()) {
      return;
    }
    const ecoGstinCtl = this.addForm.get('ecoGstin');
    ecoGstinCtl?.setValue(String(ecoGstinCtl.value ?? '').trim().toUpperCase());
    const gstin = String(ecoGstinCtl?.value ?? '').trim();
    let tradeLegal = String(this.addForm.getRawValue()['tradeLegal'] ?? '').trim();
    if (!tradeLegal && isIndianGstinFormat(gstin)) {
      await this.onEcoGstinBlur();
      tradeLegal = String(this.addForm.getRawValue()['tradeLegal'] ?? '').trim();
    }
    if (!tradeLegal) {
      this.addForm.markAllAsTouched();
      return;
    }
    if (this.addForm.invalid) {
      this.addForm.markAllAsTouched();
      return;
    }
    const v = this.addForm.getRawValue() as Record<string, string>;
    const parseMoney = (s: string): number => {
      const n = Number.parseFloat(String(s ?? '').trim());
      return Number.isFinite(n) ? n : 0;
    };
    const tab = this.ecoTab();
    const prev = tab === 'tcs' ? this.state().tcs : this.state().ninefive;
    const nextNum = prev.length === 0 ? 1 : Math.max(...prev.map((r) => r.num)) + 1;
    const row: Gstr1EcoSupplyRow = {
      num: nextNum,
      ecoGstin: String(v['ecoGstin'] ?? '').trim().toUpperCase(),
      tradeLegalName: tradeLegal,
      netVal: parseMoney(v['netVal'] ?? '0'),
      igst: parseMoney(v['igst'] ?? '0'),
      cgst: parseMoney(v['cgst'] ?? '0'),
      sgst: parseMoney(v['sgst'] ?? '0'),
      cess: parseMoney(v['cess'] ?? '0'),
    };
    const cur = this.state();
    const nextState: Gstr1EcoSuppliesState =
      tab === 'tcs'
        ? { ...cur, tcs: [...cur.tcs, row] }
        : { ...cur, ninefive: [...cur.ninefive, row] };
    this.persist(nextState);
    this.screen.set('list');
    this.resetAddForm();
  }

  deleteRow(tab: Gstr1EcoSupplyTab, num: number): void {
    const cur = this.state();
    const nextState: Gstr1EcoSuppliesState =
      tab === 'tcs'
        ? { ...cur, tcs: cur.tcs.filter((r) => r.num !== num) }
        : { ...cur, ninefive: cur.ninefive.filter((r) => r.num !== num) };
    this.persist(nextState);
  }

  openGstHelp(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    window.open('https://www.gst.gov.in/', '_blank', 'noopener,noreferrer');
  }

  refreshDrafts(): void {
    if (!this.paramsValid()) {
      this.state.set(emptyEcoSuppliesState());
      return;
    }
    const g = this.filerGstin().trim().toUpperCase();
    const rp = this.retPeriod().trim();
    const parsed = this.readStorage(g, rp);
    this.state.set(parsed ?? emptyEcoSuppliesState());
  }

  private readStorage(gstin: string, retPeriod: string): Gstr1EcoSuppliesState | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    try {
      const raw = sessionStorage.getItem(ecoSuppliesStorageKey(gstin, retPeriod));
      if (!raw) {
        return null;
      }
      const o = JSON.parse(raw) as unknown;
      if (!o || typeof o !== 'object') {
        return null;
      }
      const tcs = (o as { tcs?: unknown }).tcs;
      const ninefive = (o as { ninefive?: unknown }).ninefive;
      if (!Array.isArray(tcs) || !Array.isArray(ninefive)) {
        return null;
      }
      return {
        tcs: tcs as Gstr1EcoSupplyRow[],
        ninefive: ninefive as Gstr1EcoSupplyRow[],
      };
    } catch {
      return null;
    }
  }

  private persist(next: Gstr1EcoSuppliesState): void {
    this.state.set(next);
    if (!this.paramsValid()) {
      return;
    }
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    try {
      sessionStorage.setItem(
        ecoSuppliesStorageKey(this.filerGstin().trim().toUpperCase(), this.retPeriod().trim()),
        JSON.stringify(next),
      );
    } catch {
      /* quota */
    }
  }
}
