import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';

@Component({
  selector: 'lib-auth-financial-year-field',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './auth-financial-year-field.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthFinancialYearFieldComponent {
  readonly control = input.required<FormControl<string | null>>();
  readonly inputId = input<string>('financialYear');
  readonly label = input<string>('Financial Year');

  /** Matches legacy accounting login options. */
  readonly years = [
    '2021-2022',
    '2022-2023',
    '2023-2024',
    '2024-2025',
    '2025-2026',
    '2026-2027',
    '2027-2028',
  ] as const;
}
