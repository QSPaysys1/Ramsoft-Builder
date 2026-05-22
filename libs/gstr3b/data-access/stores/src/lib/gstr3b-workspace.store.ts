import { Injectable, signal } from '@angular/core';
import type {
  Gstr3bAutoliabBundle,
  Gstr3bRetsaveFormState,
} from '@ramsoft-builder/gstr3b/models/entities';
import type { Gstr3bViewState } from '@ramsoft-builder/gstr3b/models/enums';
import { emptyGstr3bRetsaveFormState } from '@ramsoft-builder/gstr3b/utils/calculators';

/**
 * Workspace state: summary bundle + full retsave form for section editors.
 * Loaded via retsum-first, autoliab-fallback (see WorkspaceFacade).
 */
@Injectable({ providedIn: 'root' })
export class Gstr3bWorkspaceStore {
  readonly viewState = signal<Gstr3bViewState>('idle');
  readonly gstin = signal('');
  readonly retPeriod = signal('');
  readonly filingLabel = signal('');
  readonly autoliabBundle = signal<Gstr3bAutoliabBundle | null>(null);
  readonly retsaveForm = signal<Gstr3bRetsaveFormState>(emptyGstr3bRetsaveFormState());
  readonly httpError = signal<unknown>(null);
  readonly logicalError = signal<string | null>(null);
  readonly cacheKey = signal<string | null>(null);

  setContext(gstin: string, retPeriod: string, filingLabel = ''): void {
    this.gstin.set(gstin.trim().toUpperCase());
    this.retPeriod.set(retPeriod.trim());
    this.filingLabel.set(filingLabel.trim());
  }

  resetForLoad(): void {
    this.viewState.set('loading');
    this.httpError.set(null);
    this.logicalError.set(null);
    this.autoliabBundle.set(null);
    this.retsaveForm.set(emptyGstr3bRetsaveFormState());
  }
}
