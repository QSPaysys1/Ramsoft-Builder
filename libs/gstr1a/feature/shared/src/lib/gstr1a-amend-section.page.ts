import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  GSTR1A_DOWNLOAD_API_OPTIONS,
  type Gstr1aDownloadApiName,
} from '@ramsoft-builder/gstr1a/models/entities';
import { Gstr1aApiService } from '@ramsoft-builder/gstr1a/data-access/api';
import { RETURN_PERIOD_REGEX } from '@ramsoft-builder/gstr1a/utils/constants';
import { indianFyLabelFromMmYyyy, monthNameFromMmYyyy } from '@ramsoft-builder/gstr1a/utils/helpers';
import { Gstr1aEmptyStateComponent } from '@ramsoft-builder/gstr1a/ui/empty-state';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'lib-gstr1a-amend-section-page',
  standalone: true,
  imports: [RouterLink, Gstr1aEmptyStateComponent],
  template: `
    <div class="p-4">
      <a [routerLink]="['/gstr1a/hub']" [queryParams]="backQueryParams()" class="text-sm text-blue-700">← GSTR-1A</a>
      <h1 class="mt-2 text-lg font-semibold">{{ title() }}</h1>
      <p class="text-sm text-slate-600">{{ periodLabel() }}</p>
      @if (loading()) {
        <p class="mt-4 text-sm">Loading amendment data…</p>
      } @else if (error()) {
        <p class="mt-4 text-sm text-red-600">{{ error() }}</p>
      } @else {
        <lib-gstr1a-empty-state class="mt-4 block" [message]="'Downloaded amendment bucket ready for editing.'" />
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Gstr1aAmendSectionPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(Gstr1aApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly amendApi = signal<Gstr1aDownloadApiName>('b2ba');
  readonly gstin = signal('');
  readonly retPeriod = signal('');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly title = computed(() => {
    const api = this.amendApi();
    return GSTR1A_DOWNLOAD_API_OPTIONS.find((x) => x.value === api)?.label ?? api;
  });

  readonly periodLabel = computed(() => {
    const r = this.retPeriod();
    return `${monthNameFromMmYyyy(r)} · FY ${indianFyLabelFromMmYyyy(r)}`;
  });

  readonly backQueryParams = computed(() => ({
    gstin: this.gstin() || undefined,
    ret_period: this.retPeriod() || undefined,
  }));

  constructor() {
    this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((d) => {
      const api = d['amendApi'] as Gstr1aDownloadApiName | undefined;
      if (api) {
        this.amendApi.set(api);
      }
    });
    const segments = this.router.url.split('/').filter(Boolean);
    if (segments[0] === 'gstr1a' && segments[1]) {
      const seg = segments[1].replace('-amendments', '');
      const mapped =
        seg === 'nil'
          ? 'nil'
          : seg === 'hsn'
            ? 'hsnsum'
            : seg === 'docs'
              ? 'doc_issue'
              : (seg as Gstr1aDownloadApiName);
      if (
        (GSTR1A_DOWNLOAD_API_OPTIONS as readonly { value: string }[]).some(
          (o) => o.value === mapped,
        )
      ) {
        this.amendApi.set(mapped as Gstr1aDownloadApiName);
      }
    }
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((qm) => {
      this.gstin.set((qm.get('gstin') ?? '').trim().toUpperCase());
      this.retPeriod.set((qm.get('ret_period') ?? '').trim());
      void this.load();
    });
  }

  private async load(): Promise<void> {
    const g = this.gstin();
    const r = this.retPeriod();
    if (g.length !== 15 || !RETURN_PERIOD_REGEX.test(r)) {
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(
        this.api.downloadGstr1aReturn({ gstin: g, ret_period: r, api_name: this.amendApi() }),
      );
    } catch {
      this.error.set('Failed to load amendment section.');
    } finally {
      this.loading.set(false);
    }
  }
}
