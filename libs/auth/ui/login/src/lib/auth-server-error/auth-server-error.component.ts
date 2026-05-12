import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'lib-auth-server-error',
  standalone: true,
  template: `
    @if (message()) {
      <div
        class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
        role="alert"
      >
        {{ message() }}
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthServerErrorComponent {
  readonly message = input<string | null>(null);
}
