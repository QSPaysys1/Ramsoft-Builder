import { Injectable, signal } from '@angular/core';
import type { Gstr3bSupDetails } from '@ramsoft-builder/gstr3b/models/entities';
import { emptyGstr3bSupDetails } from '@ramsoft-builder/gstr3b/utils/calculators';
import { Gstr3bSectionStoreBase } from './gstr3b-section-store.base';

/** Table 3.1 outward supplies draft — reference section store. */
@Injectable({ providedIn: 'root' })
export class Gstr3bOutwardSuppliesStore extends Gstr3bSectionStoreBase {
  readonly draftSupDetails = signal<Gstr3bSupDetails>(emptyGstr3bSupDetails());
}
