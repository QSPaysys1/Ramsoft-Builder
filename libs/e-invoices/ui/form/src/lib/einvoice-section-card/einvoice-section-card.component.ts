import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  standalone: true,
  selector: 'lib-einvoice-section-card',
  template: `
    <section
      class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
    >
      @if (title()) {
        <h2 class="text-lg font-semibold tracking-tight text-gray-900">
          {{ title() }}
        </h2>
        @if (subtitle()) {
          <p class="mt-1 text-sm text-gray-500">{{ subtitle() }}</p>
        }
        <div class="mt-4 space-y-4">
          <ng-content />
        </div>
      } @else {
        <ng-content />
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EinvoiceSectionCardComponent {
  readonly title = input<string>('');
  readonly subtitle = input<string>('');
}
