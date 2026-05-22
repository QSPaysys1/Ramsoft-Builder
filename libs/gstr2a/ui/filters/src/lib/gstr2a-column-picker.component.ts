import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { Gstr2aTableColumnDef } from '@ramsoft-builder/gstr2a/models/interfaces';

@Component({
  selector: 'lib-gstr2a-column-picker',
  standalone: true,
  host: { 'data-gstr2a-column-picker': '' },
  template: `
    <div class="relative flex flex-col gap-1.5">
      <span class="text-xs font-semibold text-slate-700">Display / Hide Columns</span>
      <button
        type="button"
        class="inline-flex min-h-[36px] min-w-[200px] items-center justify-between gap-2 rounded border border-slate-300 bg-white px-3 text-left text-sm text-slate-800 shadow-sm hover:bg-slate-50"
        [attr.aria-expanded]="open()"
        aria-haspopup="listbox"
        (click)="toggleOpen.emit()"
      >
        <span class="truncate">{{ visibleCount() }} of {{ totalCount() }} visible</span>
        <span class="text-slate-500" aria-hidden="true">{{ open() ? '▲' : '▼' }}</span>
      </button>
      @if (open()) {
        <div
          class="absolute left-0 top-full z-30 mt-1 w-[min(100%,22rem)] rounded border border-slate-300 bg-white shadow-lg"
          role="listbox"
        >
          <div class="border-b border-slate-200 py-1">
            <button
              type="button"
              class="block w-full px-3 py-1.5 text-left text-sm hover:bg-slate-50"
              (click)="checkAll.emit()"
            >
              Check All
            </button>
            <button
              type="button"
              class="block w-full px-3 py-1.5 text-left text-sm hover:bg-slate-50"
              (click)="uncheckAll.emit()"
            >
              Uncheck All
            </button>
          </div>
          @for (col of columns(); track col.id) {
            <label
              class="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              <input
                type="checkbox"
                [checked]="isVisibleFn()(col.id)"
                [disabled]="col.locked"
                (change)="columnToggle.emit(col.id)"
              />
              <span>{{ col.label }}</span>
            </label>
          }
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Gstr2aColumnPickerComponent<TRow extends object> {
  readonly columns = input.required<readonly Gstr2aTableColumnDef<TRow>[]>();
  readonly open = input(false);
  readonly visibleCount = input(0);
  readonly totalCount = input(0);
  readonly isVisibleFn = input.required<(id: string) => boolean>();

  readonly toggleOpen = output<void>();
  readonly checkAll = output<void>();
  readonly uncheckAll = output<void>();
  readonly columnToggle = output<string>();
}
