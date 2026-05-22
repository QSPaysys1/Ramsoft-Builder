import { Injectable, signal } from '@angular/core';
import type { Gstr1aFilingWorkflowState } from '@ramsoft-builder/gstr1a/models/enums';

/**
 * Coordinates draft → validate → preview → submit for GSTR-1A sections.
 * Proceed/reset APIs are GSTR-1-only today — extend when GSTZen adds GSTR-1A proceed.
 */
@Injectable({ providedIn: 'root' })
export class Gstr1aFilingWorkflowHandler {
  readonly state = signal<Gstr1aFilingWorkflowState>('draft');
  readonly lastError = signal<string | null>(null);

  moveTo(next: Gstr1aFilingWorkflowState): void {
    this.state.set(next);
  }

  fail(message: string): void {
    this.lastError.set(message);
    this.state.set('draft');
  }

  reset(): void {
    this.state.set('draft');
    this.lastError.set(null);
  }
}
