import { ChangeDetectionStrategy, Component, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { EinvoiceFlowStore } from '@ramsoft-builder/einvoice/data-access/state';
import { EinvoiceApiService, EwaybillApiService } from '@ramsoft-builder/einvoice/data-access/api';
import { AuthStore } from '@ramsoft-builder/auth/data-access/auth';
import { EinvoiceRepository } from '@ramsoft-builder/einvoice/data-access/persistence';
import { outboxList, outboxRemove } from '@ramsoft-builder/einvoice/utils/core';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'lib-einvoice-shell',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
  providers: [EinvoiceFlowStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EinvoiceShellComponent implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly api = inject(EinvoiceApiService);
  private readonly ewb = inject(EwaybillApiService);
  private readonly repo = inject(EinvoiceRepository);
  private readonly auth = inject(AuthStore);

  async ngOnInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || typeof navigator === 'undefined' || !navigator.onLine) {
      return;
    }
    const uid = this.auth.user()?.id;
    if (!uid) {
      return;
    }
    for (const entry of await outboxList()) {
      try {
        const obs =
          entry.mode === 'irn'
            ? this.api.generateIrn(entry.request)
            : this.ewb.generateIrnWithEwayBill(entry.request);
        const res = await firstValueFrom(obs);
        await this.repo.saveGenerated(uid, entry.request, res);
        await outboxRemove(entry.id);
      } catch {
        break;
      }
    }
  }
}
