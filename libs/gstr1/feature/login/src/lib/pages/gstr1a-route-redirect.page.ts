import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  GSTR1A_AMEND_LEGACY_ROUTE_MAP,
  GSTR1A_LEGACY_ROUTE_MAP,
} from '@ramsoft-builder/gstr1a/utils/constants';

/** Preserves query params when moving legacy `/gstr1/workspace/gstr1a-*` URLs to `/gstr1a/*`. */
@Component({
  selector: 'lib-gstr1a-route-redirect-page',
  standalone: true,
  template: `<p class="px-4 py-8 text-sm text-slate-600">Redirecting to GSTR-1A…</p>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Gstr1aRouteRedirectPageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  ngOnInit(): void {
    const target = this.route.snapshot.data['gstr1aTarget'] as string;
    const amendSuffix = this.route.snapshot.data['gstr1aAmendSuffix'] as string | undefined;
    let path = GSTR1A_LEGACY_ROUTE_MAP[target] ?? '/gstr1a/hub';
    if (amendSuffix && GSTR1A_AMEND_LEGACY_ROUTE_MAP[amendSuffix]) {
      path = GSTR1A_AMEND_LEGACY_ROUTE_MAP[amendSuffix];
    }
    const snap = this.route.snapshot;
    const gstin =
      snap.paramMap.get('gstin') ??
      snap.queryParamMap.get('gstin') ??
      undefined;
    const retPeriod =
      snap.paramMap.get('retPeriod') ??
      snap.queryParamMap.get('ret_period') ??
      undefined;
    void this.router.navigate([path], {
      queryParams: {
        ...snap.queryParams,
        gstin: gstin ?? undefined,
        ret_period: retPeriod ?? undefined,
      },
    });
  }
}
