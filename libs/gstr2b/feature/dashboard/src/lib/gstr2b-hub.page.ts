import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Gstr2bReturnPeriodStore } from '@ramsoft-builder/gstr2b/data-access/stores';
import { GSTR2B_HUB_NAV } from '@ramsoft-builder/gstr2b/utils/constants';

@Component({
  selector: 'lib-gstr2b-hub-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './gstr2b-hub.page.html',
  styleUrl: './gstr2b-hub.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Gstr2bHubPageComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly period = inject(Gstr2bReturnPeriodStore);

  readonly tiles = GSTR2B_HUB_NAV;
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
    void this.router.navigate([route], {
      queryParams: this.period.toQueryParams(),
    });
  }
}
