import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Gstr3bApiService } from '@ramsoft-builder/gstr3b/data-access/api';
import { normalizeGstr3bHttpError } from '@ramsoft-builder/gstr3b/data-access/services';
import {
  Gstr3bOutwardSuppliesStore,
  Gstr3bWorkspaceStore,
} from '@ramsoft-builder/gstr3b/data-access/stores';
import type { Gstr3bSupDetails } from '@ramsoft-builder/gstr3b/models/entities';
import {
  buildGstr3bRetsavePayload,
  gstr3bRetsaveLogicalError,
  withComputedItcNet,
} from '@ramsoft-builder/gstr3b/utils/calculators';
import { Gstr3bWorkspaceFacade } from './gstr3b-workspace.facade';

/** Reference section: Table 3.1 `sup_details` + retsave. */
@Injectable({ providedIn: 'root' })
export class Gstr3bOutwardSuppliesFacade {
  private readonly api = inject(Gstr3bApiService);
  private readonly workspaceFacade = inject(Gstr3bWorkspaceFacade);
  readonly store = inject(Gstr3bOutwardSuppliesStore);
  readonly workspace = inject(Gstr3bWorkspaceStore);

  readonly viewState = this.store.viewState;
  readonly draftSupDetails = this.store.draftSupDetails;
  readonly retsaveSubmitting = this.store.retsaveSubmitting;
  readonly retsaveMessage = this.store.retsaveMessage;

  async load(gstin: string, retPeriod: string, filingLabel = ''): Promise<void> {
    this.store.setContext(gstin, retPeriod, filingLabel);
    if (!this.store.paramsValid()) {
      return;
    }
    this.store.viewState.set('loading');
    this.store.logicalError.set(null);
    await this.workspaceFacade.ensureRetsaveForm(gstin, retPeriod, filingLabel);
    if (this.workspace.viewState() === 'error') {
      this.store.logicalError.set(this.workspace.logicalError());
      this.store.viewState.set('error');
      return;
    }
    this.store.draftSupDetails.set(
      structuredClone(this.workspace.retsaveForm().sup_details),
    );
    this.store.viewState.set('ready');
  }

  async save(gstin: string, retPeriod: string): Promise<boolean> {
    if (!this.store.paramsValid() || this.store.retsaveSubmitting()) {
      return false;
    }
    const form = withComputedItcNet({
      ...this.workspace.retsaveForm(),
      sup_details: this.store.draftSupDetails(),
    });
    const body = buildGstr3bRetsavePayload(gstin, retPeriod, form);
    this.store.retsaveSubmitting.set(true);
    this.store.retsaveMessage.set(null);
    try {
      const res = await firstValueFrom(this.api.retsaveGstr3bReturn(body));
      const err = gstr3bRetsaveLogicalError(res);
      if (err) {
        this.store.retsaveMessage.set(err);
        return false;
      }
      this.workspace.retsaveForm.set(form);
      this.store.retsaveMessage.set('Saved successfully.');
      return true;
    } catch (e: unknown) {
      this.store.retsaveMessage.set('Save failed.');
      normalizeGstr3bHttpError(e);
      return false;
    } finally {
      this.store.retsaveSubmitting.set(false);
    }
  }

  patchDraft(patch: Partial<Gstr3bSupDetails>): void {
    this.store.draftSupDetails.update((d) => ({ ...d, ...patch }));
  }
}
