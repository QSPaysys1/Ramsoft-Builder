import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { Gstr2bTableColumnDef } from '@ramsoft-builder/gstr2b/utils/constants';

@Component({
  selector: 'lib-gstr2b-invoice-table',
  standalone: true,
  template: `
    <div class="overflow-x-auto">
      <table
        class="gstr2b-invoice-table w-full min-w-[960px] border-collapse text-left text-sm"
      >
        <thead>
          <tr class="border-b border-slate-200 bg-slate-50">
            @for (col of columns(); track col.id) {
              <th class="px-3 py-2 font-semibold text-slate-800">{{ col.label }}</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track trackRow($index, row)) {
            <tr class="border-b border-slate-100 hover:bg-slate-50/80">
              @for (col of columns(); track col.id) {
                <td class="px-3 py-2 text-slate-800">
                  {{ cellDisplay(row, col.field) }}
                </td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Gstr2bInvoiceTableComponent<TRow extends object> {
  readonly columns = input.required<readonly Gstr2bTableColumnDef<TRow>[]>();
  readonly rows = input.required<readonly TRow[]>();
  readonly trackByField = input<keyof TRow & string>('supplierGstin' as keyof TRow & string);

  readonly rowClick = output<TRow>();

  trackRow(index: number, row: TRow): string {
    const key = this.trackByField();
    const v = row[key];
    return v !== undefined && v !== null ? String(v) : String(index);
  }

  cellDisplay(row: TRow, field: keyof TRow & string): string {
    const v = String(row[field] ?? '').trim();
    return v.length > 0 ? v : '—';
  }
}
