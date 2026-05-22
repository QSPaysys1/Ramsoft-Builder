import { JsonPipe } from '@angular/common';
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
  FormGroup,
  ReactiveFormsModule,
  Validators,
  type AbstractControl,
  type ValidationErrors,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  RETURN_PERIOD_REGEX,
  coerceGstr1DownloadApiName,
  type Gstr1DownloadApiName,
} from '@ramsoft-builder/gstr1/data-access/gstzen-auth';
import {
  Gstr1SectionRetsaveFacade,
  submitGstr1SectionRetsave,
} from '@ramsoft-builder/gstr1/data-access/gstr1-filing';
import { merge } from 'rxjs';
import { startWith } from 'rxjs/operators';
import {
  GSTR1_NIL_RESAVE_INV_ORDER,
  GSTR1_NIL_SUPPLY_ROWS,
} from '../constants/gstr1-nil-supplies.constants';

const AMT_PATTERN = Validators.pattern(/^\d+(\.\d{1,2})?$/);

function stripAmountCommas(raw: string): string {
  return raw.replace(/,/g, '').trim();
}

function moneyAmountValidator(control: AbstractControl): ValidationErrors | null {
  const raw = (control.value as string | null | undefined)?.trim();
  if (!raw) {
    return null;
  }
  const n = stripAmountCommas(raw);
  if (!/^\d+(\.\d{1,2})?$/.test(n)) {
    return { moneyAmount: true };
  }
  return null;
}

function roundMoney2(n: number): number {
  return Math.round(n * 100) / 100;
}

@Component({
  selector: 'lib-gstr1-nil-supplies-page',
  standalone: true,
  imports: [JsonPipe, RouterLink, ReactiveFormsModule],
  providers: [Gstr1SectionRetsaveFacade],
  templateUrl: './gstr1-nil-supplies.page.html',
  styleUrl: './gstr1-b2b-add-record.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-[60vh]' },
})
export class Gstr1NilSuppliesPageComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly retsaveFacade = inject(Gstr1SectionRetsaveFacade);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly apiName = signal<Gstr1DownloadApiName>('nil');
  readonly filerGstin = signal('');
  readonly retPeriod = signal('');
  readonly filingStatusLabel = signal('');
  readonly dueDateLabel = signal('');

  readonly rowMeta = GSTR1_NIL_SUPPLY_ROWS;

  readonly saveSubmitting = this.retsaveFacade.saveSubmitting;
  readonly saveError = this.retsaveFacade.saveError;
  readonly saveSuccessPayload = this.retsaveFacade.saveSuccessPayload;
  readonly requestPayloadJson = signal<string>('');

  readonly form = this.fb.group({
    lines: this.fb.array(
      GSTR1_NIL_SUPPLY_ROWS.map(() =>
        this.fb.group({
          nil_amt: ['0.00', [AMT_PATTERN, moneyAmountValidator]],
          expt_amt: ['0.00', [AMT_PATTERN, moneyAmountValidator]],
          ngsup_amt: ['0.00', [AMT_PATTERN, moneyAmountValidator]],
        }),
      ),
    ),
  });

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((pm) => {
      const api = coerceGstr1DownloadApiName(pm.get('apiName'));
      const g = (pm.get('gstin') ?? '').trim().toUpperCase();
      const rp = (pm.get('retPeriod') ?? '').trim();
      this.apiName.set(api);
      this.filerGstin.set(g);
      this.retPeriod.set(rp);
      if (api !== 'nil') {
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

    merge(this.form.valueChanges, this.form.statusChanges)
      .pipe(startWith(null), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refreshRequestPayloadPreview());
  }

  get lines(): FormArray<FormGroup> {
    return this.form.controls.lines;
  }

  lineGroup(i: number): FormGroup {
    return this.lines.at(i) as FormGroup;
  }

  showFieldError(ctrl: AbstractControl): boolean {
    return ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  paramsValid(): boolean {
    return (
      this.filerGstin().length === 15 &&
      RETURN_PERIOD_REGEX.test(this.retPeriod().trim()) &&
      this.apiName() === 'nil'
    );
  }

  dashboardUrl(): unknown[] {
    return ['/gstr1/workspace/gstr1-download'];
  }

  dashboardQueryParams(): Record<string, string> {
    const g = this.filerGstin().trim().toUpperCase();
    const rp = this.retPeriod().trim();
    const o: Record<string, string> = {
      gstin: g,
      ret_period: rp,
      api_name: 'nil',
    };
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
    const raw = stripAmountCommas((s ?? '').trim());
    if (!raw) {
      return 0;
    }
    const n = Number.parseFloat(raw);
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

  /** NIC `nil: { inv: [ { sply_ty, nil_amt, expt_amt, ngsup_amt } ] }` plus `fp`, `gstin`, `gt`, `cur_gt`. */
  private buildRetsavePayload(): Record<string, unknown> | null {
    if (!this.paramsValid()) {
      return null;
    }

    const rows = this.lines.getRawValue() as {
      nil_amt: string;
      expt_amt: string;
      ngsup_amt: string;
    }[];

    let gt = 0;
    const inv: Record<string, unknown>[] = [];

    for (const { sply_ty, lineIndex } of GSTR1_NIL_RESAVE_INV_ORDER) {
      const r = rows[lineIndex] ?? { nil_amt: '0', expt_amt: '0', ngsup_amt: '0' };
      const nilAmt = roundMoney2(this.parseAmt(r.nil_amt));
      const exptAmt = roundMoney2(this.parseAmt(r.expt_amt));
      const ngsupAmt = roundMoney2(this.parseAmt(r.ngsup_amt));
      gt += nilAmt + exptAmt + ngsupAmt;
      /** Match NIC reference object shape (`sply_ty`, then amounts). */
      inv.push({
        sply_ty,
        expt_amt: exptAmt,
        nil_amt: nilAmt,
        ngsup_amt: ngsupAmt,
      });
    }

    gt = roundMoney2(gt);

    return {
      fp: this.retPeriod().trim(),
      gstin: this.filerGstin().trim().toUpperCase(),
      gt,
      cur_gt: gt,
      nil: { inv },
    };
  }

  async submit(): Promise<void> {
    if (!this.paramsValid()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }

    await submitGstr1SectionRetsave(this.retsaveFacade, {
      isGstr1a: false,
      buildPayload: () => this.buildRetsavePayload(),
    });
    this.cdr.markForCheck();
  }
}
