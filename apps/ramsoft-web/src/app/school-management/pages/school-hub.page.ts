import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { getSchoolMainMenu, isSchoolMenuId } from '../data/school-menu.config';

@Component({
  standalone: true,
  selector: 'app-school-hub-page',
  templateUrl: './school-hub.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchoolHubPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly menuId = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('menuId') ?? 'home')),
    { initialValue: 'home' },
  );

  readonly activeMenu = computed(() => {
    const id = this.menuId();
    if (!isSchoolMenuId(id)) {
      return undefined;
    }
    return getSchoolMainMenu(id);
  });

  constructor() {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const id = params.get('menuId') ?? '';
        if (id && !isSchoolMenuId(id)) {
          void this.router.navigate(['/school-management', 'hub', 'home'], {
            replaceUrl: true,
          });
        }
      });
  }
}
