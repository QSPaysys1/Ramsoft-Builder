import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'lib-gstr2a-section-loader',
  standalone: true,
  template: `
    <div class="flex items-center justify-center gap-2 px-4 py-12 text-sm text-slate-600">
      <span
        class="inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-[#1a56a7]"
        aria-hidden="true"
      ></span>
      <span>{{ message() }}</span>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Gstr2aSectionLoaderComponent {
  readonly message = input('Loading…');
}
