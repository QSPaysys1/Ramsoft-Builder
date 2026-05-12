import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { QRCodeComponent } from 'angularx-qrcode';

@Component({
  selector: 'lib-einvoice-qr-view',
  standalone: true,
  imports: [QRCodeComponent],
  template: `
    @if (data(); as d) {
      <div class="einv-qr">
        <qrcode [qrdata]="d" [width]="216" [errorCorrectionLevel]="'M'" />
      </div>
    } @else {
      <p class="einv-qr-empty">No QR payload.</p>
    }
  `,
  styleUrl: './einvoice-qr.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EinvoiceQrViewComponent {
  readonly data = input<string | null>(null);
}
