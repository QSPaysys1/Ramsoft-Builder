import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'lib-gstr2a-empty-state',
  standalone: true,
  template: `
    <div class="px-4 py-12 text-center text-sm text-slate-600">
      <p class="font-semibold text-slate-800">{{ title() }}</p>
      @if (detail()) {
        <p class="mt-2">{{ detail() }}</p>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Gstr2aEmptyStateComponent {
  readonly title = input('No records found');
  readonly detail = input('');
}
