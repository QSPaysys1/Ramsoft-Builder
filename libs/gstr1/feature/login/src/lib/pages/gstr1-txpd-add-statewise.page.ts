import { JsonPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  type AbstractControl,
  type FormGroup,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  Gstr1GstnOtpApiService,
  RETURN_PERIOD_REGEX,
  coerceGstr1DownloadApiName,
  type Gstr1DownloadApiName,
} from '@ramsoft-builder/gstr1/data-access/gstzen-auth';
import { firstValueFrom, merge } from 'rxjs';
import { startWith } from 'rxjs/operators';
import { INDIAN_STATE_POS_OPTIONS } from '../constants/indian-state-pos.options';

const TXPD_DIFF_PERCENT_OPTIONS = [
  { label: '65%', value: '0.65' },
  { label: '70%', value: '0.70' },
  { label: '75%', value: '0.75' },
  { label: '80%', value: '0.80' },
  { label: '85%', value: '0.85' },
  { label: '90%', value: '0.90' },
  { label: '95%', value: '0.95' },
] as const;

const TXPD_RATE_SLABS = [
  0, 0.1, 0.25, 1, 1.5, 3, 5, 6, 7.5, 12, 18, 28, 40,
] as const;

function stripAmountCommas(raw: string): string {
  return raw.replace(/,/g, '').trim();
}

const OPTIONAL_AMOUNT = Validators.pattern(/^$|^\d+(\.\d{1,2})?$/);

@Component({
  selector: 'lib-gstr1-txpd-add-statewise-page',
  standalone: true,
  imports: [JsonPipe, RouterLink, ReactiveFormsModule],
  templateUrl: './gstr1-txpd-add-statewise.page.html',
  styleUrl: './gstr1-b2b-add-record.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-[60vh]' },
})
export class Gstr1TxpdAddStatewisePageComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(Gstr1GstnOtpApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly apiName = signal<Gstr1DownloadApiName>('txp');
  readonly filerGstin = signal('');
  readonly retPeriod = signal('');
  readonly filingStatusLabel = signal('');
  readonly dueDateLabel = signal('');

  readonly saveSubmitting = signal(false);
  readonly saveError = signal<unknown>(null);
  readonly saveSuccessPayload = signal<unknown>(null);
  readonly requestPayloadJson = signal<string>('');

  readonly statePosOptions = INDIAN_STATE_POS_OPTIONS;
  readonly rateSlabs = TXPD_RATE_SLABS;
  readonly diffPercentOptions = TXPD_DIFF_PERCENT_OPTIONS;

  readonly form = this.fb.group({
    chkDiffRate: [false],
    diffPercent: ['', OPTIONAL_AMOUNT],
    pos: ['', [Validators.required, Validators.pattern(/^\d{2}$/)]],
    rateRows: this.fb.array(
      TXPD_RATE_SLABS.map(() =>
        this.fb.group({
          ad_amt: ['', OPTIONAL_AMOUNT],
          iamt: ['', OPTIONAL_AMOUNT],
          csamt: ['', OPTIONAL_AMOUNT],
          camt: ['', OPTIONAL_AMOUNT],
          samt: ['', OPTIONAL_AMOUNT],
        }),
      ),
    ),
  });

  constructor() {
    this.form.controls.chkDiffRate.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((on) => {
      const d = this.form.controls.diffPercent;
      if (on) {
        d.setValidators([Validators.required, Validators.pattern(/^\d+(\.\d{1,3})?$/)]);
        if (!d.value) {
          d.setValue('0.65', { emitEvent: false });
        }
        d.markAsTouched();
      } else {
        d.setValidators([OPTIONAL_AMOUNT]);
        d.setValue('', { emitEvent: false });
        d.markAsUntouched();
      }
      d.updateValueAndValidity();
      this.cdr.markForCheck();
    });

    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((pm) => {
      const api = coerceGstr1DownloadApiName(pm.get('apiName'));
      const g = (pm.get('gstin') ?? '').trim().toUpperCase();
      const rp = (pm.get('retPeriod') ?? '').trim();
      this.apiName.set(api);
      this.filerGstin.set(g);
      this.retPeriod.set(rp);
      if (api !== 'txp') {
        void this.router.navigate(['/gstr1/workspace/gstr1-download/section', api, g, rp], {
          replaceUrl: true,
        });
      }
      this.refreshRequestPayloadPreview();
    });

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((qm) => {
      this.filingStatusLabel.set((qm.get('filing_status') ?? '').trim());
      this.dueDateLabel.set((qm.get('due_date') ?? '').trim());
    });

    this.form.controls.pos.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.cdr.markForCheck();
    });

    merge(this.form.valueChanges, this.form.statusChanges)
      .pipe(startWith(null), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refreshRequestPayloadPreview());
  }

  get rateRows(): FormArray<FormGroup> {
    return this.form.controls.rateRows;
  }

  supplyTypeLabel(): string {
    const pos = this.form.controls.pos.value?.trim() ?? '';
    const filer = this.filerGstin().trim().toUpperCase();
    if (pos.length !== 2 || filer.length !== 15) {
      return '—';
    }
    return pos === filer.slice(0, 2) ? 'Intra-State' : 'Inter-State';
  }

  isIntraStateSupply(): boolean {
    return this.supplyTypeLabel() === 'Intra-State';
  }

  showFieldError(ctrl: AbstractControl): boolean {
    return ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  paramsValid(): boolean {
    return (
      this.filerGstin().length === 15 &&
      RETURN_PERIOD_REGEX.test(this.retPeriod().trim()) &&
      this.apiName() === 'txp'
    );
  }

  backUrl(): unknown[] {
    return [
      '/gstr1/workspace/gstr1-download/section',
      this.apiName(),
      this.filerGstin(),
      this.retPeriod().trim(),
    ];
  }

  backQueryParams(): Record<string, string> {
    const o: Record<string, string> = {};
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

  private parseAmt(s: string | undefined): number {
    const n = Number.parseFloat(stripAmountCommas((s ?? '').trim()));
    return Number.isFinite(n) ? n : 0;
  }

  private refreshRequestPayloadPreview(): void {
    const p = this.buildRetsavePayload();
    this.requestPayloadJson.set(
      p
        ? JSON.stringify(p, null, 2)
        : '// Fix GSTIN and return period in the URL to preview the retsave payload.',
    );
    this.cdr.markForCheck();
  }

  private buildRetsavePayload(): Record<string, unknown> | null {
    if (!this.paramsValid()) {
      return null;
    }
    const fv = this.form.getRawValue() as {
      chkDiffRate: boolean;
      diffPercent: string;
      pos: string;
    };

    const intra = this.isIntraStateSupply();
    const itms: Record<string, unknown>[] = [];
    const rowVals = this.rateRows.getRawValue() as {
      ad_amt: string;
      iamt: string;
      csamt: string;
      camt: string;
      samt: string;
    }[];

    let turnoverSum = 0;

    for (let i = 0; i < TXPD_RATE_SLABS.length; i++) {
      const row = rowVals[i];
      const rt = TXPD_RATE_SLABS[i];
      const adAmt = this.parseAmt(row?.ad_amt);
      let iamt = this.parseAmt(row?.iamt);
      let camt = this.parseAmt(row?.camt);
      let samt = this.parseAmt(row?.samt);
      const csamt = this.parseAmt(row?.csamt);

      if (adAmt === 0 && iamt === 0 && camt === 0 && samt === 0 && csamt === 0) {
        continue;
      }

      if (intra && iamt !== 0 && camt === 0 && samt === 0) {
        camt = iamt / 2;
        samt = iamt / 2;
        iamt = 0;
      }

      turnoverSum += adAmt + iamt + csamt + camt + samt;

      const line: Record<string, unknown> = {
        rt,
        ad_amt: adAmt,
        iamt,
        csamt,
      };
      if (camt !== 0 || samt !== 0) {
        line['camt'] = camt;
        line['samt'] = samt;
      }
      itms.push(line);
    }

    const parseN = (s: string): number => Number.parseFloat(stripAmountCommas(s));

    const entry: Record<string, unknown> = {
      pos: (fv.pos ?? '').trim(),
      sply_ty: intra ? 'INTRA' : 'INTER',
      itms,
    };

    const dpfRaw = fv.diffPercent?.trim();
    if (fv.chkDiffRate && dpfRaw) {
      entry['diff_percent'] = parseN(dpfRaw);
    }

    const gt = turnoverSum > 0 ? turnoverSum : 0;

    return {
      fp: this.retPeriod().trim(),
      gstin: this.filerGstin().trim().toUpperCase(),
      gt,
      cur_gt: gt,
      txpd: [entry],
    };
  }

  private rateGridHasData(): boolean {
    const rows = this.rateRows.getRawValue() as {
      ad_amt: string;
      iamt: string;
      csamt: string;
      camt: string;
      samt: string;
    }[];
    return rows.some(
      (r) =>
        this.parseAmt(r.ad_amt) !== 0 ||
        this.parseAmt(r.iamt) !== 0 ||
        this.parseAmt(r.csamt) !== 0 ||
        this.parseAmt(r.camt) !== 0 ||
        this.parseAmt(r.samt) !== 0,
    );
  }

  async submit(): Promise<void> {
    if (!this.paramsValid()) {
      return;
    }

    if (!this.rateGridHasData()) {
      this.saveError.set({
        message:
          'Enter gross advance adjusted and tax in at least one rate row under Item details.',
      });
      this.cdr.markForCheck();
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }

    this.saveSubmitting.set(true);
    this.saveError.set(null);
    this.saveSuccessPayload.set(null);

    const payload = this.buildRetsavePayload();
    if (!payload) {
      this.saveSubmitting.set(false);
      this.cdr.markForCheck();
      return;
    }

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
            /* keep string */
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
      this.cdr.markForCheck();
    }
  }
}
