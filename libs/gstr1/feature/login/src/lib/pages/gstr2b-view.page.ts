import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

/** @deprecated Use `/gstr2b/summary`. Preserves old workspace links. */
@Component({
  selector: 'lib-gstr2b-view-page',
  standalone: true,
  template: `<p class="px-4 py-8 text-sm text-slate-600">Redirecting to GSTR-2B…</p>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Gstr2bViewPageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  ngOnInit(): void {
    void this.router.navigate(['/gstr2b', 'summary'], {
      queryParams: this.route.snapshot.queryParams,
    });
  }
}
