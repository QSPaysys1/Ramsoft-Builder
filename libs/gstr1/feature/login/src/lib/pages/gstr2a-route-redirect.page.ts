import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

/** Preserves query params when moving legacy `/gstr1/workspace/gstr2a-*` URLs to `/gstr2a/*`. */
@Component({
  selector: 'lib-gstr2a-route-redirect-page',
  standalone: true,
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Gstr2aRouteRedirectPageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  ngOnInit(): void {
    const target = this.route.snapshot.data['gstr2aTarget'] as string;
    void this.router.navigate(['/gstr2a', target], {
      queryParamsHandling: 'preserve',
    });
  }
}
