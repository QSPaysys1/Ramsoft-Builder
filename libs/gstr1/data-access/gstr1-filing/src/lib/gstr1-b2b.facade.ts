import { Injectable, signal } from '@angular/core';
import { Gstr1RetsaveFacade } from './gstr1-retsave.facade';

/** B2B retsave payload holder — pages set fields then call {@link submit}. */
@Injectable({ providedIn: 'root' })
export class Gstr1B2bFacade extends Gstr1RetsaveFacade {
  readonly filerGstin = signal('');
  readonly retPeriod = signal('');
  readonly gstr1aMode = signal(false);

  private payloadBuilder: (() => Record<string, unknown> | null) | null = null;

  /** Register the page’s `buildRetsavePayload` implementation before submit. */
  registerPayloadBuilder(fn: () => Record<string, unknown> | null): void {
    this.payloadBuilder = fn;
  }

  setContext(gstin: string, retPeriod: string, isGstr1a: boolean): void {
    this.filerGstin.set(gstin.trim().toUpperCase());
    this.retPeriod.set(retPeriod.trim());
    this.gstr1aMode.set(isGstr1a);
  }

  protected override buildRetsavePayload(): Record<string, unknown> | null {
    return this.payloadBuilder?.() ?? null;
  }

  protected override isGstr1aWorkspace(): boolean {
    return this.gstr1aMode();
  }
}
