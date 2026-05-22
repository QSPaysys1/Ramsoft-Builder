import { Injectable } from '@angular/core';
import type { Gstr2aB2bSupplierRow } from '@ramsoft-builder/gstr2a/models/entities';
import { Gstr2aSectionStoreBase } from './gstr2a-section-store.base';

/** B2B supplier summary rows — owned by {@link Gstr2aB2bFacade}. */
@Injectable({ providedIn: 'root' })
export class Gstr2aB2bStore extends Gstr2aSectionStoreBase<Gstr2aB2bSupplierRow> {}
