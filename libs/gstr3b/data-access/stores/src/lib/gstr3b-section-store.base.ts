import { signal } from '@angular/core';
import { GSTR3B_RETURN_PERIOD_REGEX } from '@ramsoft-builder/gstr3b/utils/constants';
import type { Gstr3bViewState } from '@ramsoft-builder/gstr3b/models/enums';

export abstract class Gstr3bSectionStoreBase {
  readonly viewState = signal<Gstr3bViewState>('idle');
  readonly gstin = signal('');
  readonly retPeriod = signal('');
  readonly filingLabel = signal('');
  readonly logicalError = signal<string | null>(null);
  readonly retsaveSubmitting = signal(false);
  readonly retsaveMessage = signal<string | null>(null);

  setContext(gstin: string, retPeriod: string, filingLabel = ''): void {
    this.gstin.set(gstin.trim().toUpperCase());
    this.retPeriod.set(retPeriod.trim());
    this.filingLabel.set(filingLabel.trim());
  }

  paramsValid(): boolean {
    const g = this.gstin().trim();
    const r = this.retPeriod().trim();
    return g.length === 15 && GSTR3B_RETURN_PERIOD_REGEX.test(r);
  }
}
