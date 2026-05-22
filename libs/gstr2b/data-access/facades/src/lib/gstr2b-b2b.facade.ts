import { computed, inject, Injectable } from '@angular/core';
import {
  Gstr2bB2bStore,
  Gstr2bPaginationStore,
  Gstr2bTableFilterStore,
} from '@ramsoft-builder/gstr2b/data-access/stores';
import type { Gstr2bBundle, Gstr2bDocRow } from '@ramsoft-builder/gstr2b/models/entities';
import { GSTR2B_B2B_DOC_KEY, GSTR2B_DOCUMENT_TABLE_COLUMNS } from '@ramsoft-builder/gstr2b/utils/constants';
import { gstr2bDocRowsForTable, gstr2bDocRowsToCsv } from '@ramsoft-builder/gstr2b/utils/mappers';
import { Gstr2bBundleSectionFacadeBase } from './gstr2b-bundle-section.facade';

/** Reference section: B2B invoice documents from bundle `docData.b2b`. */
@Injectable({ providedIn: 'root' })
export class Gstr2bB2bFacade extends Gstr2bBundleSectionFacadeBase<Gstr2bDocRow> {
  readonly store = inject(Gstr2bB2bStore);
  private readonly filterStore = inject(Gstr2bTableFilterStore);
  private readonly pagination = inject(Gstr2bPaginationStore);

  readonly viewState = this.store.viewState;
  readonly docRows = this.store.rows;
  readonly tableColumns = GSTR2B_DOCUMENT_TABLE_COLUMNS;

  readonly filteredRows = computed(() =>
    this.filterStore.filteredRows(this.docRows(), [
      'supplierGstin',
      'tradeName',
      'invoiceNumber',
    ]),
  );

  readonly pagedRows = computed(() =>
    this.pagination.paginatedSlice(this.filteredRows()),
  );

  readonly visibleColumns = computed(() =>
    this.filterStore.visibleColumns(GSTR2B_DOCUMENT_TABLE_COLUMNS),
  );

  constructor() {
    super();
    this.filterStore.configureColumns(GSTR2B_DOCUMENT_TABLE_COLUMNS);
  }

  protected override mapBundle(bundle: Gstr2bBundle): readonly Gstr2bDocRow[] {
    return gstr2bDocRowsForTable(bundle, GSTR2B_B2B_DOC_KEY);
  }

  downloadCsv(): string | null {
    const rows = this.filteredRows();
    if (rows.length === 0) {
      return null;
    }
    const cols = this.visibleColumns().map((c) => ({
      label: c.label,
      field: c.field,
    }));
    return gstr2bDocRowsToCsv(rows, cols);
  }
}
