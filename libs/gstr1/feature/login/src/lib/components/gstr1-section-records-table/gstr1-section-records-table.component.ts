import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import type { Gstr1SectionUiKind } from '../../models/gstr1-return-section.model';
import type { Gstr1SectionDetailRow } from '../../models/gstr1-return-section.model';

@Component({
  selector: 'lib-gstr1-section-records-table',
  standalone: true,
  imports: [],
  templateUrl: './gstr1-section-records-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class Gstr1SectionRecordsTableComponent {
  readonly rows = input.required<readonly Gstr1SectionDetailRow[]>();
  readonly uiKind = input.required<Gstr1SectionUiKind>();
  readonly expandedIds = input.required<ReadonlySet<string>>();
  readonly formatMoney = input.required<(n: number) => string>();

  readonly rowToggle = output<string>();

  readonly hasRows = computed(() => this.rows().length > 0);

  /** Column count for expanded detail row `colspan`. */
  readonly detailColspan = computed(() => {
    switch (this.uiKind()) {
      case 'hsn':
        return 12;
      case 'exp':
        return 13;
      case 'cdnr':
        return 12;
      case 'cdnur':
        return 12;
      case 'b2cl':
      case 'b2cs':
        return 13;
      default:
        return 14;
    }
  });

  badgeClass(source: Gstr1SectionDetailRow['source']): string {
    switch (source) {
      case 'api':
        return 'bg-emerald-50 text-emerald-900 ring-emerald-200';
      case 'local':
        return 'bg-amber-50 text-amber-950 ring-amber-200';
      case 'ewb':
        return 'bg-sky-50 text-sky-950 ring-sky-200';
      default:
        return 'bg-slate-50 text-slate-800 ring-slate-200';
    }
  }

  onToggle(rowId: string): void {
    this.rowToggle.emit(rowId);
  }
}
