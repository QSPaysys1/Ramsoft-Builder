import { inject, Injectable } from '@angular/core';
import { Gstr1aB2baDraftStore, Gstr1aB2baSectionStore } from '@ramsoft-builder/gstr1a/data-access/stores';
import { Gstr1aAmendmentEngine } from '@ramsoft-builder/gstr1a/shared/amendment-engine';
import { isGstr1DownloadSuccessEnvelope } from '@ramsoft-builder/gstr1a/utils/mappers';
import { Gstr1aSectionFacadeBase } from './gstr1a-section-facade.base';
import { Gstr1aRetsaveFacade } from './gstr1a-retsave.facade';

/** Reference amendment section: B2BA download, comparison, draft, retsave. */
@Injectable({ providedIn: 'root' })
export class Gstr1aB2baFacade extends Gstr1aSectionFacadeBase {
  readonly store = inject(Gstr1aB2baSectionStore);
  protected override readonly sectionApi = 'b2ba';

  private readonly engine = inject(Gstr1aAmendmentEngine);
  private readonly draftStore = inject(Gstr1aB2baDraftStore);
  private readonly retsave = inject(Gstr1aB2baRetsaveFacade);

  readonly diffSummaries = this.draftStore.diffSummaries;

  async loadWithComparison(gstin: string, retPeriod: string, filingLabel = ''): Promise<void> {
    await this.load(gstin, retPeriod, filingLabel);
    const [orig, amend] = await Promise.all([
      this.engine.fetchOriginal(gstin, retPeriod, 'b2ba'),
      this.engine.fetchAmendment(gstin, retPeriod, 'b2ba'),
    ]);
    const diffs = this.engine.buildDiffs(orig, amend, 'b2ba');
    this.draftStore.setDraft(this.store.rawResponse(), diffs);
  }

  async submitAmendment(gstin: string, retPeriod: string): Promise<void> {
    this.retsave.setContext(gstin, retPeriod, this.store.rawResponse(), 'b2ba');
    await this.retsave.submit();
  }
}

@Injectable({ providedIn: 'root' })
class Gstr1aB2baRetsaveFacade extends Gstr1aRetsaveFacade {
  private gstin = '';
  private retPeriod = '';
  private raw: unknown = null;
  private apiName = 'b2ba' as const;

  setContext(
    gstin: string,
    retPeriod: string,
    raw: unknown,
    apiName: 'b2ba',
  ): void {
    this.gstin = gstin;
    this.retPeriod = retPeriod;
    this.raw = raw;
    this.apiName = apiName;
  }

  protected override buildRetsavePayload(): Record<string, unknown> | null {
    const section = this.sectionFromDownload(this.raw, this.apiName);
    if (!section || !isGstr1DownloadSuccessEnvelope(this.raw)) {
      return null;
    }
    const msg = (this.raw as { message: Record<string, unknown> }).message;
    const gt = typeof msg['gt'] === 'number' ? msg['gt'] : 0;
    const curGt = typeof msg['cur_gt'] === 'number' ? msg['cur_gt'] : gt;
    return {
      fp: this.retPeriod.trim(),
      gstin: this.gstin.trim().toUpperCase(),
      gt,
      cur_gt: curGt,
      b2ba: section,
    };
  }
}
