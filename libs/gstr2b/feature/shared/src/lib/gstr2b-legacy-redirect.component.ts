import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'lib-gstr2b-legacy-redirect',
  standalone: true,
  template: `<p class="px-4 py-8 text-sm text-slate-600">Redirecting…</p>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Gstr2bLegacyRedirectComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  ngOnInit(): void {
    const target = this.route.snapshot.data['gstr2bTarget'] as string | undefined;
    if (target) {
      void this.router.navigate(['/gstr2b', target], {
        queryParamsHandling: 'preserve',
      });
      return;
    }
    const legacyPath = this.route.snapshot.data['legacyPath'] as string | undefined;
    if (legacyPath) {
      void this.router.navigate(['/gstr1/workspace', legacyPath], {
        queryParamsHandling: 'preserve',
      });
    }
  }
}
