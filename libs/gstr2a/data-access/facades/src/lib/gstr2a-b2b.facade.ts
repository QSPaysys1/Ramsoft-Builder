import { computed, inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Gstr2aB2bApiService } from '@ramsoft-builder/gstr2a/data-access/api';
import {
  Gstr2aB2bStore,
  Gstr2aTableFilterStore,
} from '@ramsoft-builder/gstr2a/data-access/stores';
import type { Gstr2aB2bSupplierRow } from '@ramsoft-builder/gstr2a/models/entities';
import { GSTR2A_B2B_TABLE_COLUMNS } from '@ramsoft-builder/gstr2a/utils/constants';
import {
  gstr2aB2bLogicalError,
  gstr2aB2bRowsToCsv,
  parseGstr2aB2bSuppliersFromPayload,
} from '@ramsoft-builder/gstr2a/utils/mappers';
import { Gstr2aSectionFacadeBase } from './gstr2a-section-facade.base';

/** B2B section — pages bind to store signals exposed here. */
@Injectable({ providedIn: 'root' })
export class Gstr2aB2bFacade extends Gstr2aSectionFacadeBase<Gstr2aB2bSupplierRow> {
  private readonly api = inject(Gstr2aB2bApiService);
  private readonly filterStore = inject(Gstr2aTableFilterStore);
  readonly store = inject(Gstr2aB2bStore);

  readonly viewState = this.store.viewState;
  readonly gstin = this.store.gstin;
  readonly retPeriod = this.store.retPeriod;
  readonly filingLabel = this.store.filingLabel;
  readonly httpError = this.store.httpError;
  readonly logicalError = this.store.logicalError;
  readonly supplierRows = this.store.rows;

  readonly tableColumns = GSTR2A_B2B_TABLE_COLUMNS;

  readonly filteredRows = computed(() =>
    this.filterStore.filteredRows(this.supplierRows(), [
      'supplierGstin',
      'supplierName',
    ]),
  );

  readonly visibleColumns = computed(() =>
    this.filterStore.visibleColumns(GSTR2A_B2B_TABLE_COLUMNS),
  );

  constructor() {
    super();
    this.filterStore.configureColumns(GSTR2A_B2B_TABLE_COLUMNS);
  }

  paramsValid(): boolean {
    return this.store.paramsValid();
  }

  protected override fetchPayload(
    gstin: string,
    retPeriod: string,
  ): Observable<unknown> {
    return this.api.fetch({ gstin, ret_period: retPeriod });
  }

  protected override parseLogicalError(payload: unknown): string | null {
    return gstr2aB2bLogicalError(payload);
  }

  protected override mapPayload(payload: unknown): readonly Gstr2aB2bSupplierRow[] {
    return parseGstr2aB2bSuppliersFromPayload(payload);
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
    return gstr2aB2bRowsToCsv(rows, cols);
  }
}
