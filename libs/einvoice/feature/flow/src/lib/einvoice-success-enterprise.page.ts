import { ChangeDetectionStrategy, Component, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { EinvoiceFlowStore } from '@ramsoft-builder/einvoice/data-access/state';
import { EinvoiceQrViewComponent } from '@ramsoft-builder/einvoice/ui/sections';

@Component({
  selector: 'lib-einvoice-success-enterprise-page',
  standalone: true,
  imports: [RouterLink, EinvoiceQrViewComponent],
  templateUrl: './einvoice-success-enterprise.page.html',
  styleUrl: './einvoice-flow-pages.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EinvoiceSuccessEnterprisePageComponent implements OnInit {
  private readonly router = inject(Router);
  readonly store = inject(EinvoiceFlowStore);
  private readonly platformId = inject(PLATFORM_ID);

  showQr = false;

  ngOnInit(): void {
    if (this.store.status() !== 'success' || !this.store.lastResponse()) {
      void this.router.navigate(['/e-invoice', 'create']);
      return;
    }
    this.showQr = isPlatformBrowser(this.platformId);
  }
}
