import { Component, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  standalone: true,
  selector: 'lib-einvoice-item-row',
  imports: [ReactiveFormsModule],
  template: `
    <div
      [formGroup]="group()"
      class="space-y-3 border-b border-gray-100 py-4 sm:space-y-4"
    >
      <div
        class="grid grid-cols-1 gap-3 sm:grid-cols-12 sm:items-end"
      >
        <div class="sm:col-span-1">
          <label class="mb-1 block text-xs font-medium text-gray-600" [attr.for]="id('itemno')"
            >Item #</label
          >
          <input
            [id]="id('itemno')"
            formControlName="ItemNo"
            type="number"
            class="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm"
          />
        </div>
        <div class="sm:col-span-1">
          <label class="mb-1 block text-xs font-medium text-gray-600" [attr.for]="id('sl')"
            >Sl No</label
          >
          <input
            [id]="id('sl')"
            formControlName="SlNo"
            type="text"
            class="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm"
          />
        </div>
        <div class="sm:col-span-3">
          <label class="mb-1 block text-xs font-medium text-gray-600" [attr.for]="id('prd')"
            >Product / service</label
          >
          <input
            [id]="id('prd')"
            formControlName="PrdDesc"
            type="text"
            class="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm"
          />
        </div>
        <div class="sm:col-span-2">
          <label class="mb-1 block text-xs font-medium text-gray-600" [attr.for]="id('hsn')"
            >HSN / SAC</label
          >
          <input
            [id]="id('hsn')"
            formControlName="HsnCd"
            type="text"
            class="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm"
          />
        </div>
        <div class="sm:col-span-1">
          <label class="mb-1 block text-xs font-medium text-gray-600" [attr.for]="id('svc')"
            >Svc?</label
          >
          <select
            [id]="id('svc')"
            formControlName="IsServc"
            class="w-full rounded-lg border border-gray-200 px-1 py-2 text-sm"
          >
            <option value="N">Goods</option>
            <option value="Y">Service</option>
          </select>
        </div>
        <div class="sm:col-span-1">
          <label class="mb-1 block text-xs font-medium text-gray-600" [attr.for]="id('brand')"
            >Brand</label
          >
          <input
            [id]="id('brand')"
            formControlName="Brand"
            type="text"
            class="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm"
          />
        </div>
        <div class="sm:col-span-1">
          <label class="mb-1 block text-xs font-medium text-gray-600" [attr.for]="id('bags')"
            >Bags</label
          >
          <input
            [id]="id('bags')"
            formControlName="Bags"
            type="number"
            class="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm"
          />
        </div>
        <div class="sm:col-span-1">
          <label class="mb-1 block text-xs font-medium text-gray-600" [attr.for]="id('utype')"
            >Unit type</label
          >
          <input
            [id]="id('utype')"
            formControlName="UnitType"
            type="number"
            class="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm"
          />
        </div>
        <div class="sm:col-span-1">
          <label class="mb-1 block text-xs font-medium text-gray-600" [attr.for]="id('qty')"
            >Qty</label
          >
          <input
            [id]="id('qty')"
            formControlName="Qty"
            type="number"
            step="0.001"
            class="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm"
          />
        </div>
      </div>

      <div
        class="grid grid-cols-1 gap-3 sm:grid-cols-12 sm:items-end"
      >
        <div class="sm:col-span-1">
          <label class="mb-1 block text-xs font-medium text-gray-600" [attr.for]="id('fq')"
            >Free qty</label
          >
          <input
            [id]="id('fq')"
            formControlName="FreeQty"
            type="number"
            class="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm"
          />
        </div>
        <div class="sm:col-span-1">
          <label class="mb-1 block text-xs font-medium text-gray-600" [attr.for]="id('unit')"
            >Unit</label
          >
          <input
            [id]="id('unit')"
            formControlName="Unit"
            type="text"
            class="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm"
          />
        </div>
        <div class="sm:col-span-1">
          <label class="mb-1 block text-xs font-medium text-gray-600" [attr.for]="id('rate')"
            >MRP / rate incl.</label
          >
          <input
            [id]="id('rate')"
            formControlName="rate"
            type="number"
            step="0.01"
            class="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm"
          />
        </div>
        <div class="sm:col-span-1">
          <label class="mb-1 block text-xs font-medium text-gray-600" [attr.for]="id('price')"
            >Price excl.</label
          >
          <input
            [id]="id('price')"
            formControlName="UnitPrice"
            type="number"
            step="0.01"
            class="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm"
          />
        </div>
        <div class="sm:col-span-1">
          <label class="mb-1 block text-xs font-medium text-gray-600" [attr.for]="id('gstrt')"
            >GST %</label
          >
          <input
            [id]="id('gstrt')"
            formControlName="GstRt"
            type="number"
            step="0.01"
            class="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm"
          />
        </div>
        <div class="sm:col-span-1">
          <label class="mb-1 block text-xs font-medium text-gray-600" [attr.for]="id('disc')"
            >Discount</label
          >
          <input
            [id]="id('disc')"
            formControlName="Discount"
            type="number"
            step="0.01"
            class="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm"
          />
        </div>
        <div class="sm:col-span-1">
          <label class="mb-1 block text-xs font-medium text-gray-600" [attr.for]="id('bar')"
            >Barcode</label
          >
          <input
            [id]="id('bar')"
            formControlName="Barcde"
            type="text"
            class="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm"
          />
        </div>
        <div class="sm:col-span-1">
          <label class="mb-1 block text-xs font-medium text-gray-600" [attr.for]="id('cesrt')"
            >Cess %</label
          >
          <input
            [id]="id('cesrt')"
            formControlName="CesRt"
            type="number"
            step="0.01"
            class="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm"
          />
        </div>
        <div class="sm:col-span-1">
          <label class="mb-1 block text-xs font-medium text-gray-600" [attr.for]="id('cesamt')"
            >Cess amt</label
          >
          <input
            [id]="id('cesamt')"
            formControlName="CesAmt"
            type="number"
            step="0.01"
            class="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm"
          />
        </div>
        <div class="sm:col-span-1">
          <label class="mb-1 block text-xs font-medium text-gray-600" [attr.for]="id('cesnad')"
            >Cess non-adv</label
          >
          <input
            [id]="id('cesnad')"
            formControlName="CesNonAdvlAmt"
            type="number"
            step="0.01"
            class="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm"
          />
        </div>
      </div>

      <div
        class="grid grid-cols-1 gap-3 sm:grid-cols-12 sm:items-end"
      >
        <div class="sm:col-span-1">
          <label class="mb-1 block text-xs font-medium text-gray-600" [attr.for]="id('scrt')"
            >State cess %</label
          >
          <input
            [id]="id('scrt')"
            formControlName="StateCesRt"
            type="number"
            step="0.01"
            class="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm"
          />
        </div>
        <div class="sm:col-span-1">
          <label class="mb-1 block text-xs font-medium text-gray-600" [attr.for]="id('scamt')"
            >State cess amt</label
          >
          <input
            [id]="id('scamt')"
            formControlName="StateCesAmt"
            type="number"
            step="0.01"
            class="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm"
          />
        </div>
        <div class="sm:col-span-1">
          <label class="mb-1 block text-xs font-medium text-gray-600" [attr.for]="id('scnad')"
            >St.cess non-adv</label
          >
          <input
            [id]="id('scnad')"
            formControlName="StateCesNonAdvlAmt"
            type="number"
            step="0.01"
            class="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm"
          />
        </div>
        <div class="sm:col-span-1">
          <label class="mb-1 block text-xs font-medium text-gray-600" [attr.for]="id('loth')"
            >Line oth chrg</label
          >
          <input
            [id]="id('loth')"
            formControlName="OthChrg"
            type="number"
            step="0.01"
            class="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm"
          />
        </div>
        <div class="sm:col-span-2">
          <label class="mb-1 block text-xs font-medium text-gray-600" [attr.for]="id('bchn')"
            >Batch name</label
          >
          <input
            [id]="id('bchn')"
            formControlName="BchNm"
            type="text"
            class="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm"
          />
        </div>
        <div class="sm:col-span-2">
          <label class="mb-1 block text-xs font-medium text-gray-600" [attr.for]="id('bche')"
            >Batch exp (DD/MM/YYYY)</label
          >
          <input
            [id]="id('bche')"
            formControlName="BchExpDt"
            type="text"
            class="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm"
          />
        </div>
        <div class="sm:col-span-2">
          <label class="mb-1 block text-xs font-medium text-gray-600" [attr.for]="id('bchw')"
            >Batch warranty</label
          >
          <input
            [id]="id('bchw')"
            formControlName="BchWrDt"
            type="text"
            class="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm"
          />
        </div>
      </div>

      <div
        class="grid grid-cols-2 gap-2 border-t border-dashed border-gray-200 pt-3 sm:grid-cols-6"
      >
        <div>
          <span class="text-xs text-gray-500">Pre tax</span>
          <div class="font-mono text-sm font-medium text-gray-900">
            {{ group().get('PreTaxVal')?.value ?? 0 }}
          </div>
        </div>
        <div>
          <span class="text-xs text-gray-500">Ass. amt</span>
          <div class="font-mono text-sm font-medium text-gray-900">
            {{ group().get('AssAmt')?.value ?? 0 }}
          </div>
        </div>
        <div>
          <span class="text-xs text-gray-500">Taxable</span>
          <div class="font-mono text-sm font-medium text-gray-900">
            {{ group().get('TotAmt')?.value ?? 0 }}
          </div>
        </div>
        @if (isInterState()) {
          <div>
            <span class="text-xs text-gray-500">IGST</span>
            <div class="font-mono text-sm font-medium text-gray-900">
              {{ group().get('IgstAmt')?.value ?? 0 }}
            </div>
          </div>
        } @else {
          <div>
            <span class="text-xs text-gray-500">CGST</span>
            <div class="font-mono text-sm font-medium text-gray-900">
              {{ group().get('CgstAmt')?.value ?? 0 }}
            </div>
          </div>
          <div>
            <span class="text-xs text-gray-500">SGST</span>
            <div class="font-mono text-sm font-medium text-gray-900">
              {{ group().get('SgstAmt')?.value ?? 0 }}
            </div>
          </div>
        }
        <div>
          <span class="text-xs text-gray-500">Line total</span>
          <div class="font-mono text-sm font-semibold text-gray-900">
            {{ group().get('TotItemVal')?.value ?? 0 }}
          </div>
        </div>
      </div>
    </div>
  `,
})
export class EinvoiceItemRowComponent {
  readonly group = input.required<FormGroup>();
  readonly isInterState = input(false);
  readonly rowKey = input.required<string>();

  protected id(suffix: string): string {
    return `${this.rowKey()}-${suffix}`;
  }
}
