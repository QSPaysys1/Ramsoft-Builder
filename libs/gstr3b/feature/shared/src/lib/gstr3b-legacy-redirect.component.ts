import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GSTR3B_LEGACY_ROUTE_MAP } from '@ramsoft-builder/gstr3b/utils/constants';

@Component({
  selector: 'lib-gstr3b-legacy-redirect',
  standalone: true,
  template: `<p class="px-4 py-8 text-sm text-slate-600">Redirecting…</p>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Gstr3bLegacyRedirectComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  ngOnInit(): void {
    const target = this.route.snapshot.data['gstr3bTarget'] as string | undefined;
    if (target) {
      void this.router.navigate(['/gstr3b', target], {
        queryParamsHandling: 'preserve',
      });
      return;
    }
    const legacyPath = this.route.snapshot.data['legacyPath'] as string | undefined;
    if (legacyPath && GSTR3B_LEGACY_ROUTE_MAP[legacyPath]) {
      void this.router.navigate([GSTR3B_LEGACY_ROUTE_MAP[legacyPath]], {
        queryParamsHandling: 'preserve',
      });
    }
  }
}
