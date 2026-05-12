import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'lib-auth-page-layout',
  standalone: true,
  templateUrl: './auth-page-layout.component.html',
  styleUrl: './auth-page-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthPageLayoutComponent {
  readonly heroImageSrc = input.required<string>();
  readonly heroImageAlt = input<string>('');
  readonly heroHeading = input<string>(
    'Keep personal and business finances separate.',
  );
}
