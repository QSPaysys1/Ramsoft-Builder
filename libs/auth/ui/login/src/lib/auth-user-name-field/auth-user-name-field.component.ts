import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';

@Component({
  selector: 'lib-auth-user-name-field',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './auth-user-name-field.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthUserNameFieldComponent {
  readonly control = input.required<FormControl<string | null>>();
  readonly inputId = input<string>('userName');
  readonly label = input<string>('User Name');
  readonly placeholder = input<string>('Enter your user name');
}
