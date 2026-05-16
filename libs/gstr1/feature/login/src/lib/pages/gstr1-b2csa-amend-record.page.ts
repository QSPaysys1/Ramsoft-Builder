import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RETURN_PERIOD_REGEX } from '@ramsoft-builder/gstr1/data-access/gstzen-auth';
import { INDIAN_STATE_POS_OPTIONS } from '../constants/indian-state-pos.options';

const MONTH_NAMES = [
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
] as const;

/** Shown when “differential %” applies (portal-style). */
const TAX_RATE_PERCENT_OPTIONS = ['65%', '125%', '130%', '150%'] as const;

function fyLabelFromRetPeriod(retPeriod: string): string {
  if (!RETURN_PERIOD_REGEX.test(retPeriod)) {
    return '';
  }
  const mm = Number.parseInt(retPeriod.slice(0, 2), 10);
  const yyyy = Number.parseInt(retPeriod.slice(2), 10);
  const fyStart = mm >= 4 ? yyyy : yyyy - 1;
  return `${fyStart}-${String(fyStart + 1).slice(-2)}`;
}

function fyOptionsAroundCenter(centerLabel: string): string[] {
  if (!centerLabel || !/^\d{4}-\d{2}$/.test(centerLabel)) {
    return [];
  }
  const start = Number.parseInt(centerLabel.slice(0, 4), 10);
  const out: string[] = [];
  for (let y = start - 1; y <= start + 1; y++) {
    out.push(`${y}-${String(y + 1).slice(-2)}`);
  }
  return out;
}

function monthNameFromRetPeriod(retPeriod: string): string {
  if (!RETURN_PERIOD_REGEX.test(retPeriod)) {
    return 'April';
  }
  const mm = Number.parseInt(retPeriod.slice(0, 2), 10);
  return MONTH_NAMES[mm - 1] ?? 'April';
}

function posPortalDisplay(code: string, label: string): string {
  const rest = label.replace(/^\d+\s*—\s*/, '').trim();
  return `${code}-${rest}`;
}

@Component({
  selector: 'lib-gstr1-b2csa-amend-record-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './gstr1-b2csa-amend-record.page.html',
  styleUrl: './gstr1-b2csa-amend-record.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-[60vh]' },
})
export class Gstr1B2csaAmendRecordPageComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly posOptions = INDIAN_STATE_POS_OPTIONS;
  readonly monthNames = MONTH_NAMES;
  readonly taxRatePercentOptions = TAX_RATE_PERCENT_OPTIONS;

  readonly gstin = signal('');
  readonly retPeriod = signal('');
  readonly filingStatusLabel = signal('');
  readonly dueDateLabel = signal('');
  readonly year = signal('');
  readonly month = signal('April');
  readonly originalPosCode = signal('36');
  readonly differentialTax = signal(true);
  readonly taxRatePercent = signal('65%');
  readonly noRecordsBannerVisible = signal(true);
  readonly posHelpBannerVisible = signal(true);

  readonly fyOptions = computed(() =>
    fyOptionsAroundCenter(fyLabelFromRetPeriod(this.retPeriod())),
  );

  readonly paramsValid = computed(() => {
    const g = this.gstin();
    const r = this.retPeriod();
    return g.length === 15 && RETURN_PERIOD_REGEX.test(r);
  });

  readonly backQueryParams = computed(() => ({
    gstin: this.gstin() || undefined,
    ret_period: this.retPeriod() || undefined,
    filing_status: this.filingStatusLabel().trim() || undefined,
    due_date: this.dueDateLabel().trim() || undefined,
  }));

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((p) => {
      const g = (p.get('gstin') ?? '').trim().toUpperCase();
      const r = (p.get('retPeriod') ?? '').trim();
      this.gstin.set(g);
      this.retPeriod.set(r);
      const fy = fyLabelFromRetPeriod(r);
      if (fy) {
        this.year.set(fy);
      }
      this.month.set(monthNameFromRetPeriod(r));
    });
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((q) => {
      this.filingStatusLabel.set((q.get('filing_status') ?? '').trim());
      this.dueDateLabel.set((q.get('due_date') ?? '').trim());
    });
  }

  posLabelForCode(code: string): string {
    const o = this.posOptions.find((p) => p.code === code);
    return o ? posPortalDisplay(o.code, o.label) : code;
  }

  selectYear(event: Event): void {
    this.year.set((event.target as HTMLSelectElement).value);
  }

  selectMonth(event: Event): void {
    this.month.set((event.target as HTMLSelectElement).value);
  }

  selectPos(event: Event): void {
    this.originalPosCode.set((event.target as HTMLSelectElement).value);
  }

  toggleDifferential(event: Event): void {
    this.differentialTax.set((event.target as HTMLInputElement).checked);
  }

  selectTaxPercent(event: Event): void {
    this.taxRatePercent.set((event.target as HTMLSelectElement).value);
  }

  openGstHelp(): void {
    window.open('https://www.gst.gov.in/', '_blank', 'noopener,noreferrer');
  }

  refreshPage(): void {
    const r = this.retPeriod();
    const fy = fyLabelFromRetPeriod(r);
    if (fy) {
      this.year.set(fy);
    }
    this.month.set(monthNameFromRetPeriod(r));
    this.originalPosCode.set('36');
    this.differentialTax.set(true);
    this.taxRatePercent.set('65%');
    this.noRecordsBannerVisible.set(true);
    this.posHelpBannerVisible.set(true);
  }

  dismissNoRecordsBanner(): void {
    this.noRecordsBannerVisible.set(false);
  }

  dismissPosHelpBanner(): void {
    this.posHelpBannerVisible.set(false);
  }

  backToWorkspace(): void {
    void this.router.navigate(['/gstr1/workspace/gstr1-download'], {
      queryParams: this.backQueryParams(),
    });
  }
}
