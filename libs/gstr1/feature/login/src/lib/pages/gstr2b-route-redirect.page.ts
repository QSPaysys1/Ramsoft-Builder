import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'lib-gstr2b-route-redirect-page',
  standalone: true,
  template: `<p class="px-4 py-8 text-sm text-slate-600">Redirecting to GSTR-2B…</p>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Gstr2bRouteRedirectPageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  ngOnInit(): void {
    const target = (this.route.snapshot.data['gstr2bTarget'] as string) ?? 'hub';
    void this.router.navigate(['/gstr2b', target], {
      queryParamsHandling: 'preserve',
    });
  }
}
