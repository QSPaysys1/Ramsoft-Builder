import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import type {
  EwaybillListView,
  EwaybillSavedListTransportFilter,
} from '@ramsoft-builder/ewaybills/models/ewb';
import {
  canCancelSavedEwaybillRow,
  canExtendEwaybillForSavedEwaybillRow,
  canUpdatePartBForSavedEwaybillRow,
  canUpdateTransporterForSavedEwaybillRow,
} from '@ramsoft-builder/ewaybills/utils/core';

const FILTER_OPTIONS: ReadonlyArray<{
  id: EwaybillSavedListTransportFilter;
  label: string;
}> = [
  { id: 'all', label: 'All' },
  { id: 'success', label: 'Success' },
  { id: 'failed', label: 'Failed' },
  { id: 'pending', label: 'Pending' },
  { id: 'updated', label: 'Updated' },
  { id: 'vehicle_changed', label: 'Vehicle changed' },
];

@Component({
  standalone: true,
  selector: 'lib-ewb-saved-bills-table',
  imports: [DatePipe, RouterLink],
  templateUrl: './ewb-saved-bills-table.component.html',
  styleUrl: './ewb-saved-bills-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EwbSavedBillsTableComponent {
  readonly rows = input.required<EwaybillListView[]>();
  readonly selectedId = input<string | null>(null);
  readonly loading = input(false);
  readonly emptyMessage = input('No saved e-way bills yet.');
  readonly showTransportFilters = input(false);
  readonly transportFilter = input<EwaybillSavedListTransportFilter>('all');
  readonly showUpdatePartB = input(true);
  /** Link to “Extend e-way bill” flow. */
  readonly showExtendEwaybill = input(false);
  /** Link to “Update transporter” flow (saved bills with EWB no.). */
  readonly showUpdateTransporter = input(true);
  readonly showCancel = input(true);
  /** When true, clicking a data row does not emit `rowSelected` (e.g. main list uses row click for nothing). */
  readonly skipRowSelect = input(false);

  readonly transportFilterChange = output<EwaybillSavedListTransportFilter>();
  readonly rowSelected = output<EwaybillListView>();
  readonly cancelClick = output<EwaybillListView>();

  protected readonly filterOptions = FILTER_OPTIONS;

  protected isSelected(row: EwaybillListView): boolean {
    return this.selectedId() === row.id;
  }

  protected rowTrClass(row: EwaybillListView): string {
    const parts = ['border-t', 'border-slate-100'];
    if (!this.skipRowSelect()) {
      parts.push('cursor-pointer');
    }
    parts.push(this.isSelected(row) ? 'bg-sky-50' : 'hover:bg-slate-50/80');
    return parts.join(' ');
  }

  protected canCancel(row: EwaybillListView): boolean {
    return canCancelSavedEwaybillRow(row);
  }

  protected canUpdatePartB(row: EwaybillListView): boolean {
    return canUpdatePartBForSavedEwaybillRow(row);
  }

  protected canUpdateTransporter(row: EwaybillListView): boolean {
    return canUpdateTransporterForSavedEwaybillRow(row);
  }

  protected canExtendEwaybill(row: EwaybillListView): boolean {
    return canExtendEwaybillForSavedEwaybillRow(row);
  }

  protected pickFilter(id: EwaybillSavedListTransportFilter): void {
    this.transportFilterChange.emit(id);
  }

  protected onRowActivate(row: EwaybillListView): void {
    if (this.skipRowSelect()) {
      return;
    }
    this.rowSelected.emit(row);
  }

  protected onCancel(row: EwaybillListView, ev: Event): void {
    ev.stopPropagation();
    this.cancelClick.emit(row);
  }
}
