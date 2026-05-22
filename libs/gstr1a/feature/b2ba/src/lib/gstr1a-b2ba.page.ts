import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Gstr1aB2baFacade } from '@ramsoft-builder/gstr1a/data-access/facades';
import { RETURN_PERIOD_REGEX } from '@ramsoft-builder/gstr1a/utils/constants';
import { indianFyLabelFromMmYyyy, monthNameFromMmYyyy } from '@ramsoft-builder/gstr1a/utils/helpers';
import { Gstr1aInvoiceComparisonComponent } from '@ramsoft-builder/gstr1a/ui/invoice-comparison';
import { validateGstr1aB2baSection } from '@ramsoft-builder/gstr1a/utils/validators';

@Component({
  selector: 'lib-gstr1a-b2ba-page',
  standalone: true,
  imports: [RouterLink, Gstr1aInvoiceComparisonComponent],
  template: `
    <div class="p-4">
      <a [routerLink]="['/gstr1a/hub']" [queryParams]="backQueryParams()" class="text-sm text-blue-700">← GSTR-1A</a>
      <h1 class="mt-2 text-lg font-semibold">9A — Amended B2B (B2BA)</h1>
      <p class="text-sm text-slate-600">{{ periodLabel() }}</p>
      @if (facade.store.viewState() === 'loading') {
        <p class="mt-4 text-sm">Loading…</p>
      } @else if (validationError()) {
        <p class="mt-4 text-sm text-red-600">{{ validationError() }}</p>
      }
      <lib-gstr1a-invoice-comparison class="mt-4 block" [summaries]="facade.diffSummaries()" />
      <button
        type="button"
        class="mt-4 rounded bg-blue-700 px-4 py-2 text-sm text-white disabled:opacity-50"
        [disabled]="!canSubmit()"
        (click)="submit()"
      >
        Save amendment (retsave)
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Gstr1aB2baPageComponent {
  readonly facade = inject(Gstr1aB2baFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly gstin = signal('');
  readonly retPeriod = signal('');
  readonly validationError = signal<string | null>(null);

  readonly periodLabel = computed(() => {
    const r = this.retPeriod();
    return `${monthNameFromMmYyyy(r)} · FY ${indianFyLabelFromMmYyyy(r)}`;
  });

  readonly backQueryParams = computed(() => ({
    gstin: this.gstin() || undefined,
    ret_period: this.retPeriod() || undefined,
  }));

  readonly canSubmit = computed(() => {
    const g = this.gstin();
    const r = this.retPeriod();
    return g.length === 15 && RETURN_PERIOD_REGEX.test(r) && this.facade.store.viewState() === 'success';
  });

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((qm) => {
      const g = (qm.get('gstin') ?? '').trim().toUpperCase();
      const r = (qm.get('ret_period') ?? '').trim();
      this.gstin.set(g);
      this.retPeriod.set(r);
      if (g.length === 15 && RETURN_PERIOD_REGEX.test(r)) {
        void this.facade.loadWithComparison(g, r);
      }
    });
  }

  async submit(): Promise<void> {
    const section = this.facade.store.rawResponse();
    const err = validateGstr1aB2baSection(
      section && typeof section === 'object' && 'message' in (section as object)
        ? (section as { message: Record<string, unknown> }).message['b2ba']
        : null,
    );
    if (err) {
      this.validationError.set(err);
      return;
    }
    this.validationError.set(null);
    await this.facade.submitAmendment(this.gstin(), this.retPeriod());
  }
}
