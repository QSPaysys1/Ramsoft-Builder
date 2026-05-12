import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { isPlatformBrowser } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EinvoiceFlowStore } from '@ramsoft-builder/einvoice/data-access/state';
import type { EnterpriseEinvoiceFormValue, ItemForm } from '@ramsoft-builder/einvoice/models/nic';
import {
  EinvoiceBuyerSectionComponent,
  EinvoiceDispatchSectionComponent,
  EinvoiceItemsSectionComponent,
  EinvoiceSellerSectionComponent,
  EinvoiceShipSectionComponent,
  EinvoiceTaxSummarySectionComponent,
  EinvoiceTransportEwbSectionComponent,
} from '@ramsoft-builder/einvoice/ui/sections';
import {
  appendItemRow,
  buildEnterpriseEinvoiceFormGroup,
  formValueToEnterprise,
} from './enterprise-einvoice-form.factory';
import {
  clearDraftFromLocalStorage,
  isIntraStateSupply,
  lineGstAmounts,
  loadDraftFromLocalStorage,
  mapEnterpriseFormToRequest,
  saveDraftToLocalStorage,
  sumItemsToValDtls,
} from '@ramsoft-builder/einvoice/utils/core';

@Component({
  selector: 'lib-einvoice-create-enterprise-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    EinvoiceSellerSectionComponent,
    EinvoiceBuyerSectionComponent,
    EinvoiceDispatchSectionComponent,
    EinvoiceShipSectionComponent,
    EinvoiceItemsSectionComponent,
    EinvoiceTaxSummarySectionComponent,
    EinvoiceTransportEwbSectionComponent,
  ],
  templateUrl: './einvoice-create-enterprise.page.html',
  styleUrl: './einvoice-flow-pages.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EinvoiceCreateEnterprisePageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(EinvoiceFlowStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  readonly flowStore = this.store;
  form!: FormGroup;
  private mode: 'irn' | 'irn-ewb' = 'irn';

  ngOnInit(): void {
    this.mode = (this.route.snapshot.data['einvoiceMode'] as 'irn' | 'irn-ewb') ?? 'irn';
    this.store.setMode(this.mode);
    const draft =
      isPlatformBrowser(this.platformId) ? loadDraftFromLocalStorage() : null;
    this.form = buildEnterpriseEinvoiceFormGroup(this.fb, draft);
    this.bindRecalc();
    this.bindShipToggle();
    this.applyShipState(this.form.get('ship')?.get('sameShipping')?.value === true);
    if (this.mode === 'irn-ewb') {
      const ewb = this.form.get('ewb');
      ewb?.get('VehNo')?.addValidators([Validators.required, Validators.minLength(4)]);
      ewb?.get('TransMode')?.addValidators(Validators.required);
      ewb?.get('Distance')?.addValidators(Validators.required);
      ewb?.updateValueAndValidity();
    }
  }

  private bindRecalc(): void {
    this.form
      .get('items')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.recalcLinesAndTotals());
    this.form
      .get('seller')
      ?.get('Stcd')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.recalcLinesAndTotals());
    this.form
      .get('buyer')
      ?.get('Pos')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.recalcLinesAndTotals());
  }

  private bindShipToggle(): void {
    this.form
      .get('ship')
      ?.get('sameShipping')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((same: boolean) => {
        this.applyShipState(same === true);
      });
  }

  private applyShipState(same: boolean): void {
    const ship = this.form.get('ship') as FormGroup;
    for (const k of [
      'Gstin',
      'LglNm',
      'TrdNm',
      'Addr1',
      'Addr2',
      'Loc',
      'Pin',
      'Stcd',
      'Ph',
      'Em',
    ]) {
      const c = ship.get(k);
      if (c) {
        if (same) {
          c.disable({ emitEvent: false });
        } else {
          c.enable({ emitEvent: false });
        }
      }
    }
  }

  recalcLinesAndTotals(): void {
    const itemsArr = this.form.get('items') as FormArray<FormGroup>;
    const sellerSt = String(this.form.get('seller')?.get('Stcd')?.value ?? '');
    const buyerPos = String(this.form.get('buyer')?.get('Pos')?.value ?? '');
    const intra = isIntraStateSupply(sellerSt, buyerPos);
    for (const g of itemsArr.controls) {
      const ass = Number(g.get('AssAmt')?.value) || 0;
      const rt = Number(g.get('GstRt')?.value) || 0;
      const split = lineGstAmounts({ assAmt: ass, gstRt: rt, intraState: intra });
      g.patchValue(
        {
          IgstAmt: split.igstAmt,
          CgstAmt: split.cgstAmt,
          SgstAmt: split.sgstAmt,
          TotItemVal:
            ass +
            split.igstAmt +
            split.cgstAmt +
            split.sgstAmt +
            (Number(g.get('CesAmt')?.value) || 0) +
            (Number(g.get('CesNonAdvlAmt')?.value) || 0) +
            (Number(g.get('StateCesAmt')?.value) || 0) +
            (Number(g.get('StateCesNonAdvlAmt')?.value) || 0) +
            (Number(g.get('OthChrg')?.value) || 0),
        },
        { emitEvent: false },
      );
    }
    const valGroup = this.form.get('val') as FormGroup;
    const currentVal = valGroup.getRawValue() as EnterpriseEinvoiceFormValue['val'];
    const items = itemsArr.getRawValue() as ItemForm[];
    const merged = sumItemsToValDtls(items, currentVal, intra);
    valGroup.patchValue(merged, { emitEvent: false });
  }

  addItem(): void {
    const items = this.form.get('items') as FormArray<FormGroup>;
    appendItemRow(this.fb, items);
    this.recalcLinesAndTotals();
  }

  saveDraft(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    saveDraftToLocalStorage(formValueToEnterprise(this.form.getRawValue()));
  }

  clearDraft(): void {
    clearDraftFromLocalStorage();
    if (isPlatformBrowser(this.platformId)) {
      globalThis.location?.reload();
    }
  }

  async submit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const raw = formValueToEnterprise(this.form.getRawValue());
    const req = mapEnterpriseFormToRequest(raw, { includeEwb: this.mode === 'irn-ewb' });
    try {
      await this.store.submit(req);
      await this.router.navigate(['../success'], { relativeTo: this.route });
    } catch {
      await this.router.navigate(['../error'], { relativeTo: this.route });
    }
  }
}
