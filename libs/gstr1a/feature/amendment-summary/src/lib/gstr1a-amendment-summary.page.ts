import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GSTR1A_AMEND_RECORD_DETAIL_TILES } from '@ramsoft-builder/gstr1a/utils/constants';

@Component({
  selector: 'lib-gstr1a-amendment-summary-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="p-4">
      <h1 class="text-lg font-semibold">Amendment summary</h1>
      <ul class="mt-4 space-y-2">
        @for (tile of tiles; track tile.amendApi) {
          <li>
            <a
              [routerLink]="['/gstr1a', tile.amendApi]"
              class="text-sm text-blue-700 hover:underline"
            >{{ tile.portalLabel }}</a>
          </li>
        }
      </ul>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Gstr1aAmendmentSummaryPageComponent {
  readonly tiles = GSTR1A_AMEND_RECORD_DETAIL_TILES;
}
