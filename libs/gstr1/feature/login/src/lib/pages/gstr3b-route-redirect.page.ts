import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

/** Preserves query params when moving legacy `/gstr1/workspace/gstr3b-*` URLs to `/gstr3b/*`. */
@Component({
  selector: 'lib-gstr3b-route-redirect-page',
  standalone: true,
  template: `<p class="px-4 py-8 text-sm text-slate-600">Redirecting to GSTR-3B…</p>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Gstr3bRouteRedirectPageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  ngOnInit(): void {
    const target = this.route.snapshot.data['gstr3bTarget'] as string;
    void this.router.navigate(['/gstr3b', target], {
      queryParamsHandling: 'preserve',
    });
  }
}
