import { Injectable, signal } from '@angular/core';
import type { Gstr1aInvoiceDiffSummary } from '@ramsoft-builder/gstr1a/models/entities';

/** Amendment draft rows for B2BA — keyed by original invoice reference. */
@Injectable({ providedIn: 'root' })
export class Gstr1aB2baDraftStore {
  readonly draftSection = signal<unknown>(null);
  readonly diffSummaries = signal<readonly Gstr1aInvoiceDiffSummary[]>([]);
  readonly selectedInvoiceKey = signal<string | null>(null);

  setDraft(section: unknown, diffs: readonly Gstr1aInvoiceDiffSummary[]): void {
    this.draftSection.set(section);
    this.diffSummaries.set(diffs);
  }

  clear(): void {
    this.draftSection.set(null);
    this.diffSummaries.set([]);
    this.selectedInvoiceKey.set(null);
  }
}
