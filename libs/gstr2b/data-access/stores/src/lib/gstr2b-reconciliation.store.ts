import { Injectable, signal } from '@angular/core';
import type { Gstr2bMismatchRow } from '@ramsoft-builder/gstr2b/shared/reconciliation';

/**
 * Reconciliation workspace state (books vs GSTR-2B).
 * Wire comparison inputs from feature/reconciliation; pure compare in shared/reconciliation.
 */
@Injectable({ providedIn: 'root' })
export class Gstr2bReconciliationStore {
  readonly loading = signal(false);
  readonly mismatches = signal<readonly Gstr2bMismatchRow[]>([]);
  readonly vendorFilter = signal('');

  setMismatches(rows: readonly Gstr2bMismatchRow[]): void {
    this.mismatches.set(rows);
  }
}
