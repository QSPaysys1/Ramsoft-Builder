import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import { ActivatedRoute, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import type { SchoolAdminShellConfig } from './school-admin-shell.config';

@Component({
  standalone: true,
  selector: 'lib-school-admin-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './school-admin-shell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchoolAdminShellComponent {
  private readonly route = inject(ActivatedRoute);

  readonly config = this.route.snapshot.data['shell'] as SchoolAdminShellConfig;
}
