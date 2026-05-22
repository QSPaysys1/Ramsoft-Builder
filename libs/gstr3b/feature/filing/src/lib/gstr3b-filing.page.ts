import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'lib-gstr3b-filing-page',
  standalone: true,
  imports: [RouterLink],
  template: `<div class="p-6"><p class="text-sm">Portal filing is not implemented yet. Section saves use <code>retsave</code> via detail pages.</p><a routerLink="/gstr3b/summary" class="text-[#1a56a7]">← Summary</a></div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Gstr3bFilingPageComponent {}
