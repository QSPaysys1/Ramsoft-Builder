import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Gstr3bReturnPeriodStore } from '@ramsoft-builder/gstr3b/data-access/stores';
import { GSTR3B_HUB_NAV } from '@ramsoft-builder/gstr3b/utils/constants';

@Component({
  selector: 'lib-gstr3b-hub-page',
  standalone: true,
  imports: [],
  templateUrl: './gstr3b-hub.page.html',
  styleUrl: './gstr3b-hub.page.scss',
})
export class Gstr3bHubPageComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly period = inject(Gstr3bReturnPeriodStore);
  readonly tiles = GSTR3B_HUB_NAV;
  readonly paramsValid = this.period.paramsValid;

  constructor() {
    this.period.initializeFilters();
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((q) => {
        this.period.syncFromQueryParams({
          gstin: q.get('gstin') ?? undefined,
          ret_period: q.get('ret_period') ?? undefined,
          filing_status: q.get('filing_status') ?? undefined,
        });
      });
  }

  open(route: string): void {
    if (!this.paramsValid()) {
      return;
    }
    const segments = route.replace(/^\//, '').split('/').filter(Boolean);
    void this.router.navigate(segments, { queryParams: this.period.toQueryParams() });
  }
}
