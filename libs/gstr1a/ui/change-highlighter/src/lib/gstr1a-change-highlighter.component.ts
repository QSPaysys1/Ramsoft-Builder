import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { Gstr1aFieldDiff } from '@ramsoft-builder/gstr1a/models/entities';

@Component({
  selector: 'lib-gstr1a-change-highlighter',
  standalone: true,
  template: `
    <ul class="mt-2 space-y-1 text-xs">
      @for (d of diffs(); track d.field) {
        <li [class.text-amber-700]="d.changed" [class.text-slate-600]="!d.changed">
          <span class="font-medium">{{ d.label }}:</span>
          {{ d.original ?? '—' }} → {{ d.amended ?? '—' }}
        </li>
      }
    </ul>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Gstr1aChangeHighlighterComponent {
  readonly diffs = input<readonly Gstr1aFieldDiff[]>([]);
}
