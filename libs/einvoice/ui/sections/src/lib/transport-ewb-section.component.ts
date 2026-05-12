import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import type { FormGroup } from '@angular/forms';

@Component({
  selector: 'lib-einvoice-transport-ewb-section',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './transport-ewb-section.component.html',
  styleUrl: './einvoice-sections.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EinvoiceTransportEwbSectionComponent {
  readonly group = input.required<FormGroup>();
}
