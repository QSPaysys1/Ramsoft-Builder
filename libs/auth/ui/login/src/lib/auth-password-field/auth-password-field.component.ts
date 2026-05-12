import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';

@Component({
  selector: 'lib-auth-password-field',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './auth-password-field.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthPasswordFieldComponent {
  readonly control = input.required<FormControl<string | null>>();
  readonly inputId = input<string>('password');
  readonly label = input<string>('Password');
  readonly placeholder = input<string>('Enter your password');

  readonly passwordVisible = signal(false);

  toggleVisibility(): void {
    this.passwordVisible.update((v) => !v);
  }
}
