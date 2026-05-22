import { Injectable } from '@angular/core';
import type { Gstr2bDocRow } from '@ramsoft-builder/gstr2b/models/entities';
import { Gstr2bSectionStoreBase } from './gstr2b-section-store.base';

/** B2B document rows — populated from workspace bundle slice `docData.b2b`. */
@Injectable({ providedIn: 'root' })
export class Gstr2bB2bStore extends Gstr2bSectionStoreBase<Gstr2bDocRow> {}
