import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { SCHOOL_MAIN_MENUS } from '../data/school-menu.config';
import type { SchoolMenuId, SchoolSubMenu } from '../models/school-menu.model';

@Component({
  standalone: true,
  selector: 'app-school-menu-sidebar',
  imports: [RouterLink],
  templateUrl: './school-menu-sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchoolMenuSidebarComponent {
  private readonly router = inject(Router);

  readonly activeMenuId = input.required<SchoolMenuId>();
  readonly menus = SCHOOL_MAIN_MENUS;

  readonly expandedIds = signal<ReadonlySet<SchoolMenuId>>(new Set(['home']));

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  constructor() {
    effect(() => {
      const active = this.activeMenuId();
      this.expandedIds.update((set) => {
        const next = new Set(set);
        next.add(active);
        return next;
      });
    });
  }

  isExpanded(menuId: SchoolMenuId): boolean {
    return this.expandedIds().has(menuId);
  }

  isActive(menuId: SchoolMenuId): boolean {
    return this.activeMenuId() === menuId;
  }

  toggleSection(menuId: SchoolMenuId): void {
    this.expandedIds.update((set) => {
      const next = new Set(set);
      if (next.has(menuId)) {
        next.delete(menuId);
      } else {
        next.add(menuId);
      }
      return next;
    });
    if (menuId === 'academics') {
      void this.router.navigate(['/school-management/academics/students/all']);
      return;
    }
    void this.router.navigate(['/school-management', 'hub', menuId]);
  }

  isSubmenuLink(item: SchoolSubMenu): boolean {
    return !!item.route && !item.comingSoon;
  }

  isSubmenuActive(item: SchoolSubMenu): boolean {
    const url = this.currentUrl();
    if (item.id === 'students') {
      return (
        url.includes('/academics/students') && !url.includes('/admission/')
      );
    }
    if (item.id === 'admissions') {
      return url.includes('/admission/');
    }
    const route = item.route;
    if (!route) {
      return false;
    }
    return url === route || url.startsWith(`${route}/`);
  }
}
