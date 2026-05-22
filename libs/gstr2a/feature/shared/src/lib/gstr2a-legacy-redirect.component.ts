import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

/**
 * Temporary bridge: sends users to the matching `/gstr1/workspace/gstr2a-*` page
 * until that section is migrated into its `feature/{section}` library.
 */
@Component({
  selector: 'lib-gstr2a-legacy-redirect',
  standalone: true,
  template: `<p class="px-4 py-8 text-sm text-slate-600">Redirecting…</p>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Gstr2aLegacyRedirectComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** e.g. `gstr2a-b2ba` */
  readonly legacyPath = this.route.snapshot.data['legacyPath'] as string;

  ngOnInit(): void {
    void this.router.navigate(['/gstr1/workspace', this.legacyPath], {
      queryParamsHandling: 'preserve',
    });
  }
}
