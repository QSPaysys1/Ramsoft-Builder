import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import type { FormGroup } from '@angular/forms';

@Component({
  selector: 'lib-einvoice-tax-summary-section',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './tax-summary-section.component.html',
  styleUrl: './einvoice-sections.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EinvoiceTaxSummarySectionComponent {
  readonly group = input.required<FormGroup>();
}
