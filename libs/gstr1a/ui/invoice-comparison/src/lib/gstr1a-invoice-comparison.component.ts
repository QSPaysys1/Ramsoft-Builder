import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { Gstr1aInvoiceDiffSummary } from '@ramsoft-builder/gstr1a/models/entities';
import { Gstr1aChangeHighlighterComponent } from '@ramsoft-builder/gstr1a/ui/change-highlighter';

@Component({
  selector: 'lib-gstr1a-invoice-comparison',
  standalone: true,
  imports: [Gstr1aChangeHighlighterComponent],
  template: `
    @for (summary of summaries(); track summary.invoiceKey) {
      <section class="mb-4 rounded border border-slate-200 p-3">
        <h3 class="text-sm font-semibold text-slate-800">
          {{ summary.ctin }} — {{ summary.invoiceKey }}
        </h3>
        <lib-gstr1a-change-highlighter [diffs]="summary.diffs" />
      </section>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Gstr1aInvoiceComparisonComponent {
  readonly summaries = input<readonly Gstr1aInvoiceDiffSummary[]>([]);
}
