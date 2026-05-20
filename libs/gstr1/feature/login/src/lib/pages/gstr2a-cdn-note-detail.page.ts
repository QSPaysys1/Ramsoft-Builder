import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import {
  findGstr2aCdnNote,
  gstr2aCdnNoteKey,
  RETURN_PERIOD_REGEX,
  type Gstr2aCdnItemRow,
  type Gstr2aCdnNoteWiseRow,
} from '@ramsoft-builder/gstr1/data-access/gstzen-auth';
import { Gstr2aCdnCacheService } from '../services/gstr2a-cdn-cache.service';
import { monthNameFromMmYyyy } from '../utils/gstr2a-period-labels';

type ViewState = 'idle' | 'loading' | 'success' | 'empty' | 'error';

@Component({
  selector: 'lib-gstr2a-cdn-note-detail-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './gstr2a-cdn-note-detail.page.html',
  styleUrl: './gstr2a-cdn.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-[60vh]' },
})
export class Gstr2aCdnNoteDetailPageComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  readonly cdnCache = inject(Gstr2aCdnCacheService);

  readonly gstin = signal('');
  readonly retPeriod = signal('');
  readonly filingLabel = signal('');
  readonly supplierGstin = signal('');
  readonly noteNo = signal('');
  readonly noteDate = signal('');
  readonly noteKey = signal('');

  readonly viewState = signal<ViewState>('idle');
  readonly note = signal<Gstr2aCdnNoteWiseRow | null>(null);

  readonly paramsValid = computed(() => {
    const g = this.gstin().trim();
    const r = this.retPeriod().trim();
    const s = this.supplierGstin().trim();
    const n = this.noteNo().trim();
    return g.length === 15 && RETURN_PERIOD_REGEX.test(r) && s.length === 15 && n.length > 0;
  });

  readonly taxPeriodLabel = computed(() => monthNameFromMmYyyy(this.retPeriod()));

  readonly itemRows = computed((): readonly Gstr2aCdnItemRow[] => {
    return this.note()?.items ?? [];
  });

  readonly baseQueryParams = computed(() => ({
    gstin: this.gstin().trim().toUpperCase(),
    ret_period: this.retPeriod().trim(),
    filing_status: this.filingLabel().trim() || undefined,
    supplier_gstin: this.supplierGstin().trim().toUpperCase(),
  }));

  readonly notesListQueryParams = computed(() => this.baseQueryParams());

  constructor() {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((q) => {
        const g = (q.get('gstin') ?? '').trim().toUpperCase();
        const r = (q.get('ret_period') ?? '').trim();
        const fl = (q.get('filing_status') ?? '').trim();
        const s = (q.get('supplier_gstin') ?? '').trim().toUpperCase();
        const nn = (q.get('note_no') ?? '').trim();
        const nd = (q.get('note_date') ?? '').trim();
        const nk = (q.get('note_key') ?? '').trim();
        if (g) {
          this.gstin.set(g);
        }
        if (r) {
          this.retPeriod.set(r);
        }
        if (fl) {
          this.filingLabel.set(fl);
        }
        if (s) {
          this.supplierGstin.set(s);
        }
        if (nn) {
          this.noteNo.set(nn);
        }
        if (nd) {
          this.noteDate.set(nd);
        }
        if (nk) {
          this.noteKey.set(nk);
        }
      });

    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) {
        return;
      }
      void this.loadDetail();
    });
  }

  async loadDetail(): Promise<void> {
    if (!this.paramsValid()) {
      this.viewState.set('idle');
      return;
    }
    this.viewState.set('loading');
    const bundle = await this.cdnCache.ensureBundle(this.gstin(), this.retPeriod());
    if (this.cdnCache.loadError() || !bundle) {
      this.viewState.set('error');
      return;
    }
    let found: Gstr2aCdnNoteWiseRow | undefined;
    const nk = this.noteKey();
    if (nk) {
      found = bundle.notes.find((n) => gstr2aCdnNoteKey(n) === nk);
    }
    if (!found) {
      found = findGstr2aCdnNote(
        bundle,
        this.supplierGstin(),
        this.noteNo(),
        this.noteDate(),
      );
    }
    this.note.set(found ?? null);
    if (!found) {
      this.viewState.set('empty');
      return;
    }
    this.viewState.set(found.items.length > 0 ? 'success' : 'empty');
  }

  displayCell(value: string): string {
    const v = value.trim();
    return v.length > 0 ? v : '—';
  }

  formatRate(rate: string): string {
    const v = rate.trim();
    if (!v) {
      return '—';
    }
    return v.includes('%') ? v : `${v}%`;
  }
}
