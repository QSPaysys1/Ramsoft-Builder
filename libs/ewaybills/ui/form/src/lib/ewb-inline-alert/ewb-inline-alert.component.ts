import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  standalone: true,
  selector: 'lib-ewb-inline-alert',
  template: `
    @if (message()) {
      <div
        class="ewb-alert"
        [class.ewb-alert--error]="kind() === 'error'"
        [class.ewb-alert--success]="kind() === 'success'"
        [class.ewb-alert--info]="kind() === 'info'"
        role="alert"
      >
        <span class="ewb-alert__icon" aria-hidden="true">{{ icon() }}</span>
        <span class="ewb-alert__text">{{ message() }}</span>
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .ewb-alert {
        display: flex;
        align-items: flex-start;
        gap: 0.625rem;
        padding: 0.75rem 1rem;
        border-radius: 0.625rem;
        border: 1px solid transparent;
        font-size: 0.875rem;
        font-weight: 500;
        line-height: 1.45;
      }

      .ewb-alert__icon {
        flex-shrink: 0;
        font-size: 1rem;
        line-height: 1.25;
        opacity: 0.9;
      }

      .ewb-alert__text {
        min-width: 0;
      }

      .ewb-alert--error {
        color: rgb(127 29 29);
        background: rgb(254 242 242);
        border-color: rgb(254 202 202);
      }

      .ewb-alert--success {
        color: rgb(6 78 59);
        background: rgb(236 253 245);
        border-color: rgb(167 243 208);
      }

      .ewb-alert--info {
        color: rgb(30 41 59);
        background: rgb(248 250 252);
        border-color: rgb(226 232 240);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EwbInlineAlertComponent {
  readonly message = input<string | null>(null);
  readonly kind = input<'error' | 'success' | 'info'>('info');

  protected readonly icon = computed(() => {
    switch (this.kind()) {
      case 'error':
        return '✕';
      case 'success':
        return '✓';
      default:
        return 'ⓘ';
    }
  });
}
