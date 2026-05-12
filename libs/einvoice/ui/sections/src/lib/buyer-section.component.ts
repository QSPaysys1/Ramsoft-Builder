import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import type { FormGroup } from '@angular/forms';
import { INDIAN_GST_STATES } from '@ramsoft-builder/einvoice/utils/core';

@Component({
  selector: 'lib-einvoice-buyer-section',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './buyer-section.component.html',
  styleUrl: './einvoice-sections.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EinvoiceBuyerSectionComponent {
  readonly group = input.required<FormGroup>();
  readonly states = INDIAN_GST_STATES;
}
