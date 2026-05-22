import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'lib-gstr3b-exempt-nil-page',
  standalone: true,
  imports: [RouterLink],
  template: `<div class="p-6"><p class="text-sm">Exempt/NIL supplies are shown on the <a routerLink="/gstr3b/summary" class="text-[#1a56a7]">summary</a> dashboard (Table 5).</p></div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Gstr3bExemptNilPageComponent {}
