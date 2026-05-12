import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthToastService } from './auth-toast.service';

@Component({
  selector: 'lib-auth-toast-stack',
  standalone: true,
  template: `
    @if (toast.items().length > 0) {
      <div class="stack" role="region" aria-label="Notifications">
        @for (t of toast.items(); track t.id) {
          <div
            class="toast"
            [class.toast--info]="t.kind === 'info'"
            [class.toast--success]="t.kind === 'success'"
            [class.toast--error]="t.kind === 'error'"
            [attr.role]="t.kind === 'error' ? 'alert' : 'status'"
          >
            <span class="toast__text">{{ t.message }}</span>
            <button
              type="button"
              class="toast__close"
              (click)="toast.dismiss(t.id)"
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        }
      </div>
    }
  `,
  styleUrl: './auth-toast-stack.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthToastStackComponent {
  readonly toast = inject(AuthToastService);
}
