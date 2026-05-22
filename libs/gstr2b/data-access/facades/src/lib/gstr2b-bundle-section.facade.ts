import { inject } from '@angular/core';
import { Gstr2bWorkspaceFacade } from './gstr2b-workspace.facade';
import { Gstr2bSectionStoreBase } from '@ramsoft-builder/gstr2b/data-access/stores';

/**
 * Base for section facades that slice `Gstr2bBundle` (no separate section API).
 */
export abstract class Gstr2bBundleSectionFacadeBase<TRow> {
  protected abstract readonly store: Gstr2bSectionStoreBase<TRow>;
  private readonly workspace = inject(Gstr2bWorkspaceFacade);

  async load(gstin: string, retPeriod: string, filingLabel = ''): Promise<void> {
    this.store.setContext(gstin, retPeriod, filingLabel);
    if (!this.store.paramsValid() || this.store.viewState() === 'loading') {
      return;
    }
    this.store.resetForLoad();
    await this.workspace.load(gstin, retPeriod, filingLabel);
    const wsState = this.workspace.store.viewState();
    if (wsState === 'error') {
      this.store.logicalError.set(
        this.workspace.store.logicalError() ?? 'GSTR-2B statement failed to load.',
      );
      this.store.viewState.set('error');
      return;
    }
    const bundle = this.workspace.store.bundle();
    if (!bundle) {
      this.store.viewState.set('empty');
      return;
    }
    const rows = this.mapBundle(bundle);
    this.store.rows.set(rows);
    this.store.viewState.set(rows.length > 0 ? 'success' : 'empty');
  }

  protected abstract mapBundle(bundle: import('@ramsoft-builder/gstr2b/models/entities').Gstr2bBundle): readonly TRow[];
}
