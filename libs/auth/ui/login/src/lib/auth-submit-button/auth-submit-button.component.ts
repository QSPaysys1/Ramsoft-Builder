import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'lib-auth-submit-button',
  standalone: true,
  templateUrl: './auth-submit-button.component.html',
  styleUrl: './auth-submit-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthSubmitButtonComponent {
  readonly loading = input(false);
  readonly disabled = input(false);
  readonly label = input<string>('Sign in');
}
