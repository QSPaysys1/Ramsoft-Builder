import { Observable } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { normalizeGstr2aHttpError } from '@ramsoft-builder/gstr2a/data-access/services';
import { Gstr2aSectionStoreBase } from '@ramsoft-builder/gstr2a/data-access/stores';

/**
 * Orchestrates section load: validate → API → map → store signals.
 */
export abstract class Gstr2aSectionFacadeBase<TRow> {
  protected abstract readonly store: Gstr2aSectionStoreBase<TRow>;

  async load(gstin: string, retPeriod: string, filingLabel = ''): Promise<void> {
    this.store.setContext(gstin, retPeriod, filingLabel);
    if (!this.store.paramsValid() || this.store.viewState() === 'loading') {
      return;
    }
    this.store.resetForLoad();
    try {
      const payload = await firstValueFrom(
        this.fetchPayload(gstin, retPeriod),
      );
      const logical = this.parseLogicalError(payload);
      if (logical) {
        this.store.logicalError.set(logical);
        this.store.viewState.set('error');
        return;
      }
      const rows = this.mapPayload(payload);
      this.store.rows.set(rows);
      this.store.viewState.set(rows.length > 0 ? 'success' : 'empty');
    } catch (err: unknown) {
      this.store.httpError.set(normalizeGstr2aHttpError(err));
      this.store.viewState.set('error');
    }
  }

  protected abstract fetchPayload(
    gstin: string,
    retPeriod: string,
  ): Observable<unknown>;

  protected abstract parseLogicalError(payload: unknown): string | null;

  protected abstract mapPayload(payload: unknown): readonly TRow[];
}
