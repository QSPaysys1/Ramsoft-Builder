import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Gstr2bReconciliationStore } from '@ramsoft-builder/gstr2b/data-access/stores';

/** Scaffold: wire books comparison + {@link Gstr2bReconciliationStore}. */
@Component({
  selector: 'lib-gstr2b-reconciliation-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="px-4 py-8">
      <h1 class="text-lg font-bold">GSTR-2B reconciliation</h1>
      <p class="mt-2 text-sm text-slate-600">
        Compare invoice keys via
        <code>gstr2bCompareInvoiceKeys</code> in
        <code>@ramsoft-builder/gstr2b/shared/reconciliation</code>.
      </p>
      <p class="mt-2 text-sm">Mismatches loaded: {{ store.mismatches().length }}</p>
      <a routerLink="/gstr2b/hub" class="mt-6 inline-block text-sm text-[#1a56a7]">← Hub</a>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Gstr2bReconciliationPageComponent {
  readonly store = inject(Gstr2bReconciliationStore);
}
