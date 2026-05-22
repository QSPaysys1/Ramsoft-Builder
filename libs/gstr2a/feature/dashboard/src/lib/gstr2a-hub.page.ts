import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Gstr2aProfileService } from '@ramsoft-builder/gstr2a/data-access/services';
import { Gstr2aReturnPeriodStore } from '@ramsoft-builder/gstr2a/data-access/stores';
import {
  GSTR2A_GSTR1_WORKSPACE_PATHS,
  GSTR2A_PARTS,
  type Gstr2aSectionTile,
} from '@ramsoft-builder/gstr2a/utils/constants';

@Component({
  selector: 'lib-gstr2a-hub-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './gstr2a-hub.page.html',
  styleUrl: './gstr2a-hub.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-[60vh]' },
})
export class Gstr2aHubPageComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly period = inject(Gstr2aReturnPeriodStore);
  readonly profile = inject(Gstr2aProfileService);

  readonly parts = GSTR2A_PARTS;
  readonly gstin = this.period.gstin;
  readonly retPeriod = this.period.retPeriod;
  readonly filingLabel = this.period.filingLabel;
  readonly fyLabel = this.period.fyLabel;
  readonly taxPeriodLabel = this.period.taxPeriodLabel;
  readonly paramsValid = this.period.paramsValid;

  readonly selectedTile = signal<Gstr2aSectionTile | null>(null);

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

  selectTile(tile: Gstr2aSectionTile): void {
    if (!this.paramsValid()) {
      return;
    }
    const queryParams = this.period.toQueryParams();
    if (tile.id === 'b2b') {
      void this.router.navigate(['/gstr2a', 'b2b'], { queryParams });
      return;
    }
    const workspacePath = GSTR2A_GSTR1_WORKSPACE_PATHS[tile.id];
    if (workspacePath) {
      void this.router.navigate(['/gstr1/workspace', workspacePath], {
        queryParams,
      });
      return;
    }
    this.selectedTile.set(tile);
  }

  clearSelectedTile(): void {
    this.selectedTile.set(null);
  }

  tileActive(tile: Gstr2aSectionTile): boolean {
    return this.selectedTile()?.id === tile.id;
  }

  openGstHelp(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    window.open('https://www.gst.gov.in/', '_blank', 'noopener,noreferrer');
  }
}
