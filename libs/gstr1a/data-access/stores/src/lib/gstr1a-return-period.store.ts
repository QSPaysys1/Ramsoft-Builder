import { inject, Injectable } from '@angular/core';
import { GstrReturnPeriodStore } from '@ramsoft-builder/gstr1/data-access/gstr-returns';

/** Delegates return-period selection to shared GSTR returns store. */
@Injectable({ providedIn: 'root' })
export class Gstr1aReturnPeriodStore {
  private readonly inner = inject(GstrReturnPeriodStore);

  readonly selectedRetPeriod = this.inner.selectedRetPeriod;
  readonly canUseRetPeriod = this.inner.canUseRetPeriod;
}
