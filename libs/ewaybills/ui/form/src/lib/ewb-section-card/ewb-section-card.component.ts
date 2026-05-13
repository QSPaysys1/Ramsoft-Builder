import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  standalone: true,
  selector: 'lib-ewb-section-card',
  template: `
    <section class="ewb-card">
      @if (title() || step()) {
        <header class="ewb-card__header">
          @if (step()) {
            <span class="ewb-card__step" aria-hidden="true">{{ step() }}</span>
          }
          <div class="ewb-card__titles">
            @if (title()) {
              <h3 class="ewb-card__title">{{ title() }}</h3>
            }
            @if (hint()) {
              <p class="ewb-card__hint">{{ hint() }}</p>
            }
          </div>
        </header>
      }
      <div class="ewb-card__body">
        <ng-content />
      </div>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .ewb-card {
        border-radius: 0.875rem;
        border: 1px solid rgb(226 232 240);
        background: rgb(255 255 255);
        box-shadow:
          0 1px 2px rgb(15 23 42 / 0.04),
          0 4px 12px rgb(15 23 42 / 0.04);
        overflow: hidden;
      }

      .ewb-card__header {
        display: flex;
        align-items: flex-start;
        gap: 0.875rem;
        padding: 1rem 1.25rem;
        background: linear-gradient(180deg, rgb(248 250 252) 0%, rgb(255 255 255) 100%);
        border-bottom: 1px solid rgb(241 245 249);
      }

      .ewb-card__step {
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 2rem;
        height: 2rem;
        border-radius: 0.625rem;
        font-size: 0.8125rem;
        font-weight: 700;
        color: rgb(255 255 255);
        background: linear-gradient(145deg, rgb(30 41 59) 0%, rgb(15 23 42) 100%);
        box-shadow: 0 2px 4px rgb(15 23 42 / 0.2);
      }

      .ewb-card__titles {
        min-width: 0;
      }

      .ewb-card__title {
        margin: 0;
        font-size: 1rem;
        font-weight: 700;
        letter-spacing: -0.02em;
        color: rgb(15 23 42);
      }

      .ewb-card__hint {
        margin: 0.25rem 0 0;
        font-size: 0.8125rem;
        line-height: 1.45;
        color: rgb(100 116 139);
      }

      .ewb-card__body {
        padding: 1.25rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EwbSectionCardComponent {
  /** Optional step number shown in the badge (e.g. "1", "2"). */
  readonly step = input<string | undefined>(undefined);
  readonly title = input<string>('');
  readonly hint = input<string | undefined>(undefined);
}
