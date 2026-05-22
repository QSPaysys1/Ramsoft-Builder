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
import { Gstr2aB2bFacade } from '@ramsoft-builder/gstr2a/data-access/facades';
import { Gstr2aProfileService } from '@ramsoft-builder/gstr2a/data-access/services';
import {
  Gstr2aReturnPeriodStore,
  Gstr2aTableFilterStore,
} from '@ramsoft-builder/gstr2a/data-access/stores';
import { Gstr2aColumnPickerComponent } from '@ramsoft-builder/gstr2a/ui/filters';
import { Gstr2aSearchBoxComponent } from '@ramsoft-builder/gstr2a/ui/filters';
import { Gstr2aEmptyStateComponent } from '@ramsoft-builder/gstr2a/ui/empty-state';
import { Gstr2aInvoiceTableComponent } from '@ramsoft-builder/gstr2a/ui/invoice-table';
import { Gstr2aSectionLoaderComponent } from '@ramsoft-builder/gstr2a/ui/loaders';
import { Gstr2aHeaderSummaryComponent } from '@ramsoft-builder/gstr2a/ui/summary-cards';
import { gstr2aUserFacingMessage } from '@ramsoft-builder/gstr2a/data-access/services';

@Component({
  selector: 'lib-gstr2a-b2b-page',
  standalone: true,
  imports: [
    JsonPipe,
    RouterLink,
    Gstr2aHeaderSummaryComponent,
    Gstr2aColumnPickerComponent,
    Gstr2aSearchBoxComponent,
    Gstr2aSectionLoaderComponent,
    Gstr2aEmptyStateComponent,
    Gstr2aInvoiceTableComponent,
  ],
  templateUrl: './gstr2a-b2b.page.html',
  styleUrl: './gstr2a-b2b.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-[60vh]' },
})
export class Gstr2aB2bPageComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  readonly facade = inject(Gstr2aB2bFacade);
  readonly filterStore = inject(Gstr2aTableFilterStore);
  readonly period = inject(Gstr2aReturnPeriodStore);
  readonly profile = inject(Gstr2aProfileService);

  readonly viewState = this.facade.viewState;
  readonly gstin = this.period.gstin;
  readonly retPeriod = this.period.retPeriod;
  readonly filingLabel = this.period.filingLabel;
  readonly supplierRows = this.facade.supplierRows;
  readonly filteredRows = this.facade.filteredRows;
  readonly visibleColumns = this.facade.visibleColumns;
  readonly tableColumns = this.facade.tableColumns;
  readonly httpError = this.facade.httpError;
  readonly logicalError = this.facade.logicalError;
  readonly fyLabel = this.period.fyLabel;
  readonly taxPeriodLabel = this.period.taxPeriodLabel;
  /** Period store holds query params; facade store is empty until after first load. */
  readonly paramsValid = this.period.paramsValid;

  readonly backToHubQueryParams = (): ReturnType<Gstr2aReturnPeriodStore['toQueryParams']> =>
    this.period.toQueryParams();

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
    if (!target.closest('[data-gstr2a-column-picker]')) {
      this.filterStore.closeColumnPicker();
    }
  }

  errorMessage(): string {
    return gstr2aUserFacingMessage(this.httpError(), this.logicalError());
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
    a.download = `gstr2a-b2b-${this.gstin()}-${this.retPeriod()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  isColumnVisible(columnId: string): boolean {
    return this.filterStore.isColumnVisible(columnId, this.tableColumns);
  }

  readonly isColumnVisibleFn = (columnId: string): boolean =>
    this.isColumnVisible(columnId);
}
