import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'lib-gstr2b-header-summary',
  standalone: true,
  template: `
    <section
      class="mb-6 rounded-xl border border-slate-300 bg-slate-50/90 px-4 py-4 shadow-sm md:px-6 md:py-5"
    >
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-wide text-slate-500">GSTIN</p>
          <p class="mt-0.5 font-mono text-sm font-semibold text-slate-900">{{ gstin() }}</p>
        </div>
        <div>
          <p class="text-[11px] font-bold uppercase tracking-wide text-slate-500">Legal name</p>
          <p class="mt-0.5 text-sm font-semibold text-slate-900">{{ legalName() || '—' }}</p>
        </div>
        <div>
          <p class="text-[11px] font-bold uppercase tracking-wide text-slate-500">Trade name</p>
          <p class="mt-0.5 text-sm font-semibold text-slate-900">{{ tradeName() || '—' }}</p>
        </div>
        <div>
          <p class="text-[11px] font-bold uppercase tracking-wide text-slate-500">FY</p>
          <p class="mt-0.5 text-sm font-semibold text-slate-900">{{ fyLabel() }}</p>
        </div>
        <div>
          <p class="text-[11px] font-bold uppercase tracking-wide text-slate-500">Return period</p>
          <p class="mt-0.5 text-sm font-semibold text-slate-900">{{ taxPeriodLabel() }}</p>
        </div>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Gstr2bHeaderSummaryComponent {
  readonly gstin = input('');
  readonly legalName = input('');
  readonly tradeName = input('');
  readonly fyLabel = input('—');
  readonly taxPeriodLabel = input('—');
}
