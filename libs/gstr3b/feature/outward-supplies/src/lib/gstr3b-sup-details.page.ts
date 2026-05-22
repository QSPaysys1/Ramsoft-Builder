import { isPlatformBrowser, JsonPipe } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Gstr3bOutwardSuppliesFacade } from '@ramsoft-builder/gstr3b/data-access/facades';
import { Gstr3bReturnPeriodStore } from '@ramsoft-builder/gstr3b/data-access/stores';
import {
  buildGstr3bRetsavePayload,
  withComputedItcNet,
} from '@ramsoft-builder/gstr3b/utils/calculators';

@Component({
  selector: 'lib-gstr3b-sup-details-page',
  standalone: true,
  imports: [JsonPipe, RouterLink, FormsModule],
  templateUrl: './gstr3b-sup-details.page.html',
  styleUrl: './gstr3b-sup-details.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-[60vh]' },
})
export class Gstr3bSupDetailsPageComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly facade = inject(Gstr3bOutwardSuppliesFacade);
  readonly period = inject(Gstr3bReturnPeriodStore);

  readonly viewState = this.facade.viewState;
  readonly logicalError = this.facade.store.logicalError;
  readonly draftSupDetails = this.facade.draftSupDetails;
  readonly retsaveSubmitting = this.facade.retsaveSubmitting;
  readonly retsaveMessage = this.facade.retsaveMessage;
  readonly paramsValid = this.period.paramsValid;

  readonly backToGstr3bQueryParams = computed(() => this.period.toQueryParams());

  readonly retsavePreview = computed(() =>
    buildGstr3bRetsavePayload(
      this.period.gstin(),
      this.period.retPeriod(),
      withComputedItcNet({
        ...this.facade.workspace.retsaveForm(),
        sup_details: this.draftSupDetails(),
      }),
    ),
  );

  constructor() {
    this.period.initializeFilters();
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((q) => {
      this.period.syncFromQueryParams({
        gstin: q.get('gstin') ?? undefined,
        ret_period: q.get('ret_period') ?? undefined,
        filing_status: q.get('filing_status') ?? undefined,
      });
      if (isPlatformBrowser(this.platformId) && this.paramsValid()) {
        void this.loadDetails();
      }
    });

    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) {
        return;
      }
      void this.loadDetails();
    });
  }

  touchSupDetails(): void {
    // Draft is bound via ngModel on draftSupDetails signal object.
  }

  cancel(): void {
    this.facade.draftSupDetails.set(
      structuredClone(this.facade.workspace.retsaveForm().sup_details),
    );
    this.retsaveMessage.set(null);
  }

  loadDetails(): void {
    void this.facade.load(
      this.period.gstin(),
      this.period.retPeriod(),
      this.period.filingLabel(),
    );
  }

  confirm(): void {
    void this.facade
      .save(this.period.gstin(), this.period.retPeriod())
      .then((ok) => {
        if (ok) {
          void this.loadDetails();
        }
      });
  }
}
