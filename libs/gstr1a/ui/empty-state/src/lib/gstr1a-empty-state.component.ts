import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'lib-gstr1a-empty-state',
  standalone: true,
  template: `<p class="text-sm text-slate-600">{{ message() }}</p>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Gstr1aEmptyStateComponent {
  readonly message = input('No records for this section.');
}
