import { isPlatformBrowser, JsonPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Gstr2bB2bFacade } from '@ramsoft-builder/gstr2b/data-access/facades';
import {
  Gstr2bProfileService,
  gstr2bUserFacingMessage,
} from '@ramsoft-builder/gstr2b/data-access/services';
import {
  Gstr2bReturnPeriodStore,
  Gstr2bTableFilterStore,
  Gstr2bWorkspaceStore,
} from '@ramsoft-builder/gstr2b/data-access/stores';
import { Gstr2bColumnPickerComponent } from '@ramsoft-builder/gstr2b/ui/filters';
import { Gstr2bSearchBoxComponent } from '@ramsoft-builder/gstr2b/ui/filters';
import { Gstr2bEmptyStateComponent } from '@ramsoft-builder/gstr2b/ui/empty-state';
import { Gstr2bInvoiceTableComponent } from '@ramsoft-builder/gstr2b/ui/invoice-table';
import { Gstr2bSectionLoaderComponent } from '@ramsoft-builder/gstr2b/ui/loaders';
import { Gstr2bHeaderSummaryComponent } from '@ramsoft-builder/gstr2b/ui/summary-cards';
import { GSTR2B_DOCUMENT_TABLE_COLUMNS } from '@ramsoft-builder/gstr2b/utils/constants';

@Component({
  selector: 'lib-gstr2b-b2b-page',
  standalone: true,
  imports: [
    JsonPipe,
    RouterLink,
    Gstr2bHeaderSummaryComponent,
    Gstr2bColumnPickerComponent,
    Gstr2bSearchBoxComponent,
    Gstr2bSectionLoaderComponent,
    Gstr2bEmptyStateComponent,
    Gstr2bInvoiceTableComponent,
  ],
  templateUrl: './gstr2b-b2b.page.html',
  styleUrl: './gstr2b-b2b.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Gstr2bB2bPageComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  readonly facade = inject(Gstr2bB2bFacade);
  readonly filterStore = inject(Gstr2bTableFilterStore);
  readonly period = inject(Gstr2bReturnPeriodStore);
  readonly workspace = inject(Gstr2bWorkspaceStore);
  readonly profile = inject(Gstr2bProfileService);

  readonly tableColumns = GSTR2B_DOCUMENT_TABLE_COLUMNS;
  readonly viewState = this.facade.viewState;
  readonly gstin = this.period.gstin;
  readonly retPeriod = this.period.retPeriod;
  readonly fyLabel = this.period.fyLabel;
  readonly taxPeriodLabel = this.period.taxPeriodLabel;
  readonly paramsValid = this.period.paramsValid;
  readonly filteredRows = this.facade.filteredRows;
  readonly pagedRows = this.facade.pagedRows;
  readonly visibleColumns = this.facade.visibleColumns;
  readonly docRows = this.facade.docRows;

  readonly isColumnVisibleFn = (columnId: string): boolean =>
    this.filterStore.isColumnVisible(columnId, this.tableColumns);

  constructor() {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((q) => {
        this.period.syncFromQueryParams({
          gstin: q.get('gstin') ?? undefined,
          ret_period: q.get('ret_period') ?? undefined,
          filing_status: q.get('filing_status') ?? undefined,
        });
        if (isPlatformBrowser(this.platformId) && this.period.paramsValid()) {
          void this.reload();
        }
      });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.filterStore.columnPickerOpen()) {
      return;
    }
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    if (!target.closest('[data-gstr2b-column-picker]')) {
      this.filterStore.closeColumnPicker();
    }
  }

  errorMessage(): string {
    return gstr2bUserFacingMessage(
      this.workspace.httpError(),
      this.facade.store.logicalError() ?? this.workspace.logicalError(),
    );
  }

  async reload(): Promise<void> {
    await this.facade.load(
      this.period.gstin(),
      this.period.retPeriod(),
      this.period.filingLabel(),
    );
  }

  downloadCsv(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const csv = this.facade.downloadCsv();
    if (!csv) {
      return;
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gstr2b-b2b-${this.gstin()}-${this.retPeriod()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  backToHubQueryParams(): ReturnType<Gstr2bReturnPeriodStore['toQueryParams']> {
    return this.period.toQueryParams();
  }
}
