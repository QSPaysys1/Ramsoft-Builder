import { Injectable, signal } from '@angular/core';
import { Gstr1RetsaveFacade } from './gstr1-retsave.facade';

/**
 * Generic retsave facade for GSTR-1 section add/amend pages (B2CL, B2CS, CDN, NIL, etc.).
 * Provide at component level when multiple sections may be edited in one session.
 */
@Injectable()
export class Gstr1SectionRetsaveFacade extends Gstr1RetsaveFacade {
  readonly gstr1aMode = signal(false);

  private payloadBuilder: (() => Record<string, unknown> | null) | null = null;

  registerPayloadBuilder(fn: () => Record<string, unknown> | null): void {
    this.payloadBuilder = fn;
  }

  setGstr1aMode(isGstr1a: boolean): void {
    this.gstr1aMode.set(isGstr1a);
  }

  protected override buildRetsavePayload(): Record<string, unknown> | null {
    return this.payloadBuilder?.() ?? null;
  }

  protected override isGstr1aWorkspace(): boolean {
    return this.gstr1aMode();
  }
}
