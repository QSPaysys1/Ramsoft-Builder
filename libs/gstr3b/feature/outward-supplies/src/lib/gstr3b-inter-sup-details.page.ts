import { isPlatformBrowser, JsonPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
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
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  buildGstr3bRetsavePayload,
  emptyGstr3bInterSup,
  emptyGstr3bInterSupRow,
  emptyGstr3bRetsaveFormState,
  ensureGstr3bInterSupDefaultRows,
  gstr3bAutoliabLogicalError,
  gstr3bRetsaveLogicalError,
  gstr3bRetsumLogicalError,
  parseGstr3bRetsaveFromAutoliab,
  parseGstr3bRetsaveFromRetsum,
  RETURN_PERIOD_REGEX,
  withComputedItcNet,
  type Gstr3bInterSup,
  type Gstr3bRetsaveFormState,
  type Gstr3bRetsaveInterSupRow,
} from '@ramsoft-builder/gstr1/data-access/gstzen-auth';
import { Gstr3bApiService } from '@ramsoft-builder/gstr3b/data-access/api';
import { firstValueFrom } from 'rxjs';
import { INDIAN_STATE_POS_OPTIONS } from './constants/indian-state-pos.options';

type ViewState = 'idle' | 'loading' | 'ready' | 'error';
export type Gstr3bInterSupSectionKey = keyof Gstr3bInterSup;

const INTER_SUP_SECTIONS: readonly {
  readonly key: Gstr3bInterSupSectionKey;
  readonly title: string;
}[] = [
  { key: 'unreg_details', title: 'Supplies made to Unregistered Persons' },
  { key: 'comp_details', title: 'Supplies made to Composition Taxable Persons' },
  { key: 'uin_details', title: 'Supplies made to UIN holders' },
];

function normalizeErrorEnvelope(err: unknown): unknown {
  if (err instanceof HttpErrorResponse) {
    const bodyUnknown = err.error;
    let parsedBody = bodyUnknown;
    if (typeof bodyUnknown === 'string') {
      try {
        parsedBody = JSON.parse(bodyUnknown) as unknown;
      } catch {
        parsedBody = bodyUnknown;
      }
    }
    return {
      httpStatus: err.status,
      statusText: err.statusText,
      url: err.url ?? null,
      body: parsedBody,
    };
  }
  if (err instanceof Error) {
    return { message: err.message };
  }
  return { message: String(err) };
}

@Component({
  selector: 'lib-gstr3b-inter-sup-details-page',
  standalone: true,
  imports: [JsonPipe, RouterLink, FormsModule],
  templateUrl: './gstr3b-inter-sup-details.page.html',
  styleUrls: ['./gstr3b-sup-details.page.scss', './gstr3b-inter-sup-details.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-[60vh]' },
})
export class Gstr3bInterSupDetailsPageComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(Gstr3bApiService);

  readonly sections = INTER_SUP_SECTIONS;
  readonly posOptions = INDIAN_STATE_POS_OPTIONS;

  readonly gstin = signal('');
  readonly retPeriod = signal('');
  readonly filingLabel = signal('');

  readonly viewState = signal<ViewState>('idle');
  readonly logicalError = signal<string | null>(null);
  readonly httpError = signal<unknown>(null);

  readonly retsaveForm = signal<Gstr3bRetsaveFormState>(emptyGstr3bRetsaveFormState());
  readonly draftInterSup = signal<Gstr3bInterSup>(ensureGstr3bInterSupDefaultRows(emptyGstr3bInterSup()));

  readonly expandedSections = signal<ReadonlySet<Gstr3bInterSupSectionKey>>(
    new Set<Gstr3bInterSupSectionKey>(['unreg_details']),
  );
  readonly selectedRows = signal<Record<Gstr3bInterSupSectionKey, ReadonlySet<number>>>({
    unreg_details: new Set<number>(),
    comp_details: new Set<number>(),
    uin_details: new Set<number>(),
  });

  readonly retsaveSubmitting = signal(false);
  readonly retsaveError = signal<unknown>(null);
  readonly retsaveSuccessPayload = signal<unknown>(null);

  readonly paramsValid = computed(() => {
    const g = this.gstin().trim();
    const r = this.retPeriod().trim();
    return g.length === 15 && RETURN_PERIOD_REGEX.test(r);
  });

  readonly backToGstr3bQueryParams = computed(() => ({
    gstin: this.gstin().trim().toUpperCase(),
    ret_period: this.retPeriod().trim(),
    filing_status: this.filingLabel().trim() || undefined,
  }));

  readonly retsavePreview = computed(() =>
    buildGstr3bRetsavePayload(this.gstin(), this.retPeriod(), this.retsaveForm()),
  );

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((q) => {
      const g = (q.get('gstin') ?? '').trim().toUpperCase();
      const r = (q.get('ret_period') ?? '').trim();
      const fl = (q.get('filing_status') ?? '').trim();
      if (g) {
        this.gstin.set(g);
      }
      if (r) {
        this.retPeriod.set(r);
      }
      if (fl) {
        this.filingLabel.set(fl);
      }
    });

    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) {
        return;
      }
      void this.loadDetails();
    });
  }

  sectionRows(key: Gstr3bInterSupSectionKey): Gstr3bRetsaveInterSupRow[] {
    return this.draftInterSup()[key];
  }

  isSectionExpanded(key: Gstr3bInterSupSectionKey): boolean {
    return this.expandedSections().has(key);
  }

  toggleSection(key: Gstr3bInterSupSectionKey): void {
    this.expandedSections.update((set) => {
      const next = new Set(set);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  isRowSelected(key: Gstr3bInterSupSectionKey, index: number): boolean {
    return this.selectedRows()[key].has(index);
  }

  toggleRowSelect(key: Gstr3bInterSupSectionKey, index: number): void {
    this.selectedRows.update((map) => {
      const nextSet = new Set(map[key]);
      if (nextSet.has(index)) {
        nextSet.delete(index);
      } else {
        nextSet.add(index);
      }
      return { ...map, [key]: nextSet };
    });
  }

  clearRowSelection(key: Gstr3bInterSupSectionKey): void {
    this.selectedRows.update((map) => ({ ...map, [key]: new Set<number>() }));
  }

  touchInterSup(): void {
    const draft = structuredClone(this.draftInterSup());
    this.retsaveForm.update((form) =>
      withComputedItcNet({
        ...form,
        inter_sup: draft,
      }),
    );
  }

  addRow(key: Gstr3bInterSupSectionKey): void {
    this.draftInterSup.update((draft) => ({
      ...draft,
      [key]: [...draft[key], emptyGstr3bInterSupRow()],
    }));
    this.touchInterSup();
    this.expandedSections.update((set) => new Set(set).add(key));
  }

  removeSelected(key: Gstr3bInterSupSectionKey): void {
    const selected = this.selectedRows()[key];
    if (selected.size === 0) {
      return;
    }
    this.draftInterSup.update((draft) => {
      const remaining = draft[key].filter((_, i) => !selected.has(i));
      return {
        ...draft,
        [key]: remaining.length > 0 ? remaining : [emptyGstr3bInterSupRow()],
      };
    });
    this.clearRowSelection(key);
    this.touchInterSup();
  }

  openGstHelp(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    window.open('https://www.gst.gov.in/', '_blank', 'noopener,noreferrer');
  }

  cancel(): void {
    this.draftInterSup.set(
      ensureGstr3bInterSupDefaultRows(structuredClone(this.retsaveForm().inter_sup)),
    );
    this.selectedRows.set({
      unreg_details: new Set<number>(),
      comp_details: new Set<number>(),
      uin_details: new Set<number>(),
    });
    this.retsaveError.set(null);
    this.retsaveSuccessPayload.set(null);
  }

  async loadDetails(): Promise<void> {
    if (!this.paramsValid() || this.viewState() === 'loading') {
      return;
    }
    const gstin = this.gstin().trim().toUpperCase();
    const ret_period = this.retPeriod().trim();

    this.viewState.set('loading');
    this.logicalError.set(null);
    this.httpError.set(null);
    this.retsaveError.set(null);
    this.retsaveSuccessPayload.set(null);
    this.selectedRows.set({
      unreg_details: new Set<number>(),
      comp_details: new Set<number>(),
      uin_details: new Set<number>(),
    });

    try {
      const retsumPayload = await firstValueFrom(
        this.api.fetchGstr3bRetsum({ gstin, ret_period }),
      );
      const retsumErr = gstr3bRetsumLogicalError(retsumPayload);
      if (!retsumErr) {
        const form = parseGstr3bRetsaveFromRetsum(retsumPayload);
        if (form) {
          this.retsaveForm.set(form);
          this.draftInterSup.set(ensureGstr3bInterSupDefaultRows(structuredClone(form.inter_sup)));
          this.viewState.set('ready');
          return;
        }
      }

      const autoliabPayload = await firstValueFrom(
        this.api.fetchGstr3bAutoliab({ gstin, ret_period }),
      );
      const autoliabErr = gstr3bAutoliabLogicalError(autoliabPayload);
      if (autoliabErr) {
        this.logicalError.set(retsumErr ?? autoliabErr);
        this.viewState.set('error');
        return;
      }
      const form = parseGstr3bRetsaveFromAutoliab(autoliabPayload);
      this.retsaveForm.set(form);
      this.draftInterSup.set(ensureGstr3bInterSupDefaultRows(structuredClone(form.inter_sup)));
      this.viewState.set('ready');
    } catch (err: unknown) {
      this.httpError.set(normalizeErrorEnvelope(err));
      this.viewState.set('error');
    }
  }

  async confirm(): Promise<void> {
    if (!this.paramsValid() || this.retsaveSubmitting()) {
      return;
    }

    this.touchInterSup();
    const body = buildGstr3bRetsavePayload(
      this.gstin(),
      this.retPeriod(),
      this.retsaveForm(),
    );

    this.retsaveSubmitting.set(true);
    this.retsaveError.set(null);
    this.retsaveSuccessPayload.set(null);

    try {
      const res = await firstValueFrom(this.api.retsaveGstr3bReturn(body));
      const err = gstr3bRetsaveLogicalError(res);
      if (err) {
        this.retsaveError.set({ message: err, body: res });
        return;
      }
      this.retsaveSuccessPayload.set(res);
      await this.loadDetails();
    } catch (err: unknown) {
      this.retsaveError.set(normalizeErrorEnvelope(err));
    } finally {
      this.retsaveSubmitting.set(false);
    }
  }
}
