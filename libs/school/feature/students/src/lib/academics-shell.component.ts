import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ACADEMICS_PRIMARY_TABS } from './academics-shell.config';

@Component({
  standalone: true,
  selector: 'lib-academics-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './academics-shell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AcademicsShellComponent {
  readonly primaryTabs = ACADEMICS_PRIMARY_TABS;
}
