import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  standalone: true,
  selector: 'lib-einvoice-inline-alert',
  template: `
    @if (message()) {
      <div
        role="alert"
        [class]="
          variant() === 'success'
            ? 'rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900'
            : 'rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900'
        "
      >
        {{ message() }}
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EinvoiceInlineAlertComponent {
  readonly variant = input<'success' | 'error'>('error');
  readonly message = input<string | null>(null);
}
