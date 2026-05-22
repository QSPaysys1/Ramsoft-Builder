import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'lib-gstr2a-search-box',
  standalone: true,
  template: `
    <label class="flex flex-col gap-1">
      <span class="text-xs font-semibold text-slate-700">Search</span>
      <input
        type="search"
        class="min-h-[36px] rounded border border-slate-300 px-3 text-sm shadow-sm"
        [value]="value()"
        [placeholder]="placeholder()"
        (input)="searchChange.emit($any($event.target).value)"
      />
    </label>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Gstr2aSearchBoxComponent {
  readonly value = input('');
  readonly placeholder = input('Search GSTIN or name…');
  readonly searchChange = output<string>();
}
