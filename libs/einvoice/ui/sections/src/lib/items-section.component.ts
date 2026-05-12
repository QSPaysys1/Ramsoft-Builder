import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import type { FormArray, FormGroup } from '@angular/forms';

@Component({
  selector: 'lib-einvoice-items-section',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './items-section.component.html',
  styleUrl: './einvoice-sections.css',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class EinvoiceItemsSectionComponent {
  readonly array = input.required<FormArray<FormGroup>>();
}
