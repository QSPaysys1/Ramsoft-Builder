import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EinvoiceFlowStore } from '@ramsoft-builder/einvoice/data-access/state';

@Component({
  selector: 'lib-einvoice-error-enterprise-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './einvoice-error-enterprise.page.html',
  styleUrl: './einvoice-flow-pages.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EinvoiceErrorEnterprisePageComponent {
  readonly store = inject(EinvoiceFlowStore);
}
