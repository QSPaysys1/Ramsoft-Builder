import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { SchoolMenuSidebarComponent } from '../components/school-menu-sidebar.component';
import { isSchoolMenuId } from '../data/school-menu.config';
import type { SchoolMenuId } from '../models/school-menu.model';

@Component({
  standalone: true,
  selector: 'app-school-management-layout',
  imports: [RouterLink, RouterOutlet, SchoolMenuSidebarComponent],
  templateUrl: './school-management-layout.component.html',
  styleUrl: './school-management-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchoolManagementLayoutComponent {
  private readonly router = inject(Router);

  readonly activeMenuId = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(() => this.readMenuIdFromUrl()),
      startWith(this.readMenuIdFromUrl()),
    ),
    { initialValue: this.readMenuIdFromUrl() },
  );

  readonly wideMain = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(() => this.router.url.includes('/academics')),
      startWith(this.router.url.includes('/academics')),
    ),
    { initialValue: this.router.url.includes('/academics') },
  );

  private readMenuIdFromUrl(): SchoolMenuId {
    if (this.router.url.includes('/academics')) {
      return 'academics';
    }
    const match = this.router.url.match(/\/school-management\/hub\/([^/?]+)/);
    const id = match?.[1] ?? 'home';
    return isSchoolMenuId(id) ? id : 'home';
  }
}
