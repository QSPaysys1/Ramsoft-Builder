import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  type ValidatorFn,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthStore } from '@ramsoft-builder/auth/data-access/auth';
import { EwaybillStore } from '@ramsoft-builder/ewaybills/data-access/ewb';
import { EwbInlineAlertComponent, EwbSectionCardComponent } from '@ramsoft-builder/ewaybills/ui/form';
import { gstinValidator, mapEwbFormToRequest, pincodeValidator } from '@ramsoft-builder/ewaybills/utils/core';
import {
  ProductCatalogRepository,
  UserProfileRepository,
} from '@ramsoft-builder/e-invoices/data-access/einvoice';
import {
  INDIAN_GST_STATES,
  mapFirestoreProductDocToVarietyOption,
  type EinvoiceVarietyOption,
  type IndianGstState,
} from '@ramsoft-builder/e-invoices/feature/create';
import { catchError, map, of, startWith, switchMap } from 'rxjs';

function gstinValidatorFn(): ValidatorFn {
  return (c) => (gstinValidator(c.value) ? null : { gstin: true });
}

function pincodeValidatorFn(): ValidatorFn {
  return (c) => (pincodeValidator(c.value) ? null : { pincode: true });
}

function stateRequiredValidator(): ValidatorFn {
  return (c) => {
    const v = c.value;
    if (v === null || v === undefined || v === '') {
      return { required: true };
    }
    const n = typeof v === 'number' ? v : Number(v);
    if (!Number.isFinite(n) || n < 1) {
      return { state: true };
    }
    return null;
  };
}

/** Same public GSTIN search as legacy e-invoice create (replace with env in production). */
const GSTIN_LOOKUP_BASE = 'https://searchtaxpayer-3syvsriwua-uc.a.run.app';
const GSTIN_LOOKUP_EMAIL = 'ajay.a02@gmail.com';

interface GstSearchTaxpayerResponse {
  error?: boolean;
  message?: string;
  data: GstSearchTaxpayerData | null;
}

interface GstSearchTaxpayerData {
  gstin: string;
  tradeNam?: string;
  lgnm?: string;
  pradr?: {
    addr?: {
      bno?: string;
      st?: string;
      loc?: string;
      pncd?: string;
    };
  };
}

@Component({
  standalone: true,
  selector: 'lib-ewb-create-page',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    EwbSectionCardComponent,
    EwbInlineAlertComponent,
  ],
  templateUrl: './create-ewaybill.page.html',
  styleUrl: './create-ewaybill.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateEwaybillPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly http = inject(HttpClient);
  private readonly authStore = inject(AuthStore);
  private readonly userProfile = inject(UserProfileRepository);
  private readonly productCatalog = inject(ProductCatalogRepository);
  protected readonly store = inject(EwaybillStore);

  /** Indian GST states for selects (numeric code in form = parseInt(GSTStateCode)). */
  protected readonly states: readonly IndianGstState[] = INDIAN_GST_STATES;

  protected readonly varietyOptions = signal<EinvoiceVarietyOption[]>([]);
  protected readonly gstLoading = signal(false);
  protected readonly gstLookupError = signal<string | null>(null);

  /** Pretty-printed GSTZen POST body after a valid Generate click (last attempt). */
  protected readonly lastRequestJson = signal<string | null>(null);

  /** When GSTZen returns “GSTIN … not present in your GSTZen account”. */
  protected readonly gstZenGstinAccountHint =
    'GSTZen only accepts GSTINs registered under the same workspace as your API token. In GSTZen (my.gstzen.in), add the consignor and consignee GSTINs and complete e-way bill API setup for those registrations, then retry.';

  protected readonly form = this.fb.group({
    invoice: this.fb.group({
      supplyType: ['O', Validators.required],
      subSupplyType: ['1', Validators.required],
      subSupplyDesc: [''],
      docType: ['INV', Validators.required],
      docNo: ['', Validators.required],
      docDate: ['', Validators.required],
      fromGstin: ['', [Validators.required, gstinValidatorFn()]],
      fromTrdName: ['', Validators.required],
      fromAddr1: ['', Validators.required],
      fromAddr2: [''],
      fromPlace: ['', Validators.required],
      fromPincode: ['', [Validators.required, pincodeValidatorFn()]],
      fromStateCode: [null as number | null, [stateRequiredValidator()]],
      toGstin: ['', [Validators.required, gstinValidatorFn()]],
      toTrdName: ['', Validators.required],
      toAddr1: ['', Validators.required],
      toAddr2: [''],
      toPlace: ['', Validators.required],
      toPincode: ['', [Validators.required, pincodeValidatorFn()]],
      toStateCode: [null as number | null, [stateRequiredValidator()]],
      transactionType: [1, [Validators.required, Validators.min(1)]],
      transDistance: [1, [Validators.required, Validators.min(1)]],
      totalValue: [0, [Validators.required, Validators.min(0.01)]],
      cgstValue: [null as number | null],
      sgstValue: [null as number | null],
      igstValue: [null as number | null],
      cessValue: [null as number | null],
      cessNonAdvolValue: [null as number | null],
      totInvValue: [null as number | null],
    }),
    transporter: this.fb.group({
      transMode: ['1', Validators.required],
      transporterId: [''],
      transporterName: [''],
      transDocNo: [''],
      transDocDate: [''],
    }),
    vehicle: this.fb.group({
      vehicleNo: ['', Validators.required],
      vehicleType: ['R', Validators.required],
    }),
    items: this.fb.array([this.createItemGroup()]),
  });

  constructor() {
    this.subscribeProductVarieties();
    this.subscribeShipFromProfile();
    this.items.valueChanges
      .pipe(startWith(this.items.value), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.syncTotalValueFromItems();
      });
  }

  /** Invoice nested group for binding total value below line items. */
  protected get invoiceGroup(): FormGroup {
    return this.form.controls.invoice as FormGroup;
  }

  /** Sets `invoice.totalValue` to the sum of each row's `taxableAmount`. */
  private syncTotalValueFromItems(): void {
    let sum = 0;
    for (let i = 0; i < this.items.length; i++) {
      const raw = this.items.at(i).get('taxableAmount')?.value;
      const n = typeof raw === 'number' ? raw : Number(raw);
      sum += Number.isFinite(n) ? n : 0;
    }
    const rounded = Math.round(sum * 100) / 100;
    this.form.controls.invoice.get('totalValue')?.setValue(rounded, { emitEvent: false });
    this.cdr.markForCheck();
  }

  protected stateCodeNum(s: IndianGstState): number {
    return parseInt(s.GSTStateCode, 10);
  }

  protected isGstZenGstinAccountError(): boolean {
    const m = this.store.errorMessage();
    return typeof m === 'string' && /not present in your GSTZen account/i.test(m);
  }

  protected get items(): FormArray {
    return this.form.controls.items as FormArray;
  }

  protected addItem(): void {
    this.items.push(this.createItemGroup());
  }

  protected removeItem(i: number): void {
    if (this.items.length <= 1) {
      return;
    }
    this.items.removeAt(i);
  }

  protected onVarietySelected(rowIndex: number, event: Event): void {
    const el = event.target as HTMLSelectElement | null;
    const name = el?.value?.trim() ?? '';
    const row = this.items.at(rowIndex) as FormGroup;
    if (!row || !name) {
      return;
    }
    const opt = this.varietyOptions().find((v) => v.productName === name);
    const patch: Record<string, unknown> = { productName: name };
    if (opt?.hsnCode != null && opt.hsnCode !== '') {
      patch['hsnCode'] = typeof opt.hsnCode === 'number' ? opt.hsnCode : Number(opt.hsnCode);
    }
    if (opt?.units) {
      patch['qtyUnit'] = opt.units;
    }
    if (opt?.igst != null && Number.isFinite(opt.igst)) {
      patch['igstRate'] = opt.igst;
    }
    if (opt?.cgst != null && Number.isFinite(opt.cgst)) {
      patch['cgstRate'] = opt.cgst;
    }
    if (opt?.sgst != null && Number.isFinite(opt.sgst)) {
      patch['sgstRate'] = opt.sgst;
    }
    row.patchValue(patch);
    this.cdr.markForCheck();
  }

  protected checkToPartyGstin(): void {
    if (this.gstLoading()) {
      return;
    }
    const gstin = String(this.form.controls.invoice.get('toGstin')?.value ?? '')
      .trim()
      .toUpperCase();
    if (gstin.length !== 15) {
      this.gstLookupError.set('Enter a valid 15-character GSTIN before lookup.');
      return;
    }
    this.gstLookupError.set(null);
    this.gstLoading.set(true);
    const q = new URLSearchParams({ gstin, email: GSTIN_LOOKUP_EMAIL });
    const url = `${GSTIN_LOOKUP_BASE}?${q.toString()}`;
    this.http.get<GstSearchTaxpayerResponse>(url).subscribe({
      next: (res) => {
        if (res && !res.error && res.data) {
          this.patchShipToFromGstSearch(res.data);
        } else {
          this.gstLookupError.set('No taxpayer data returned for this GSTIN.');
        }
      },
      error: () => {
        this.gstLookupError.set('GSTIN lookup failed. Check network or try again.');
      },
      complete: () => {
        this.gstLoading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  private patchShipToFromGstSearch(data: GstSearchTaxpayerData): void {
    const addr = data.pradr?.addr;
    const pinRaw = addr?.pncd ? String(addr.pncd).replace(/\D/g, '').slice(0, 6) : '';
    const gstin = data.gstin?.trim().toUpperCase() ?? '';
    const inv = this.form.controls.invoice;
    const stPrefix = gstin.length >= 2 ? gstin.slice(0, 2) : '';
    const stNum = stPrefix ? parseInt(stPrefix, 10) : null;
    inv.patchValue({
      toGstin: gstin,
      toTrdName: (data.tradeNam ?? data.lgnm ?? '').trim(),
      toAddr1: [addr?.bno, addr?.st].filter(Boolean).join(', '),
      toPlace: (addr?.loc ?? '').trim(),
      toPincode: pinRaw,
      toStateCode: Number.isFinite(stNum as number) ? stNum : null,
    });
  }

  protected async submit(): Promise<void> {
    this.store.dismissSubmissionError();
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.lastRequestJson.set(null);
      return;
    }
    const req = mapEwbFormToRequest(this.form.getRawValue() as Record<string, unknown>);
    this.lastRequestJson.set(JSON.stringify(req, null, 2));
    try {
      await this.store.createEwaybill(req);
    } catch {
      /* store holds errorMessage */
    }
  }

  protected copyLastRequestJson(): void {
    const text = this.lastRequestJson();
    if (!text || !isPlatformBrowser(this.platformId)) {
      return;
    }
    void navigator.clipboard.writeText(text).catch(() => {
      /* ignore */
    });
  }

  private createItemGroup() {
    return this.fb.group({
      productName: ['', Validators.required],
      productDesc: [''],
      hsnCode: [1001, [Validators.required, Validators.min(1)]],
      quantity: [1, [Validators.required, Validators.min(0.0001)]],
      qtyUnit: ['NOS', Validators.required],
      taxableAmount: [0, [Validators.required, Validators.min(0.01)]],
      igstRate: [null as number | null],
      cgstRate: [null as number | null],
      sgstRate: [null as number | null],
      cessRate: [null as number | null],
      cessNonAdvol: [null as number | null],
    });
  }

  private subscribeProductVarieties(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    toObservable(this.authStore.user)
      .pipe(
        switchMap((user) => {
          if (!user?.id) {
            return of<EinvoiceVarietyOption[]>([]);
          }
          return this.productCatalog.watchProductsForUser(user.id).pipe(
            map((rows) =>
              rows
                .map((d) => mapFirestoreProductDocToVarietyOption(d))
                .filter((v) => v.productName.length > 0),
            ),
            catchError(() => of<EinvoiceVarietyOption[]>([])),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((list) => {
        this.varietyOptions.set(list);
        this.cdr.markForCheck();
      });
  }

  private subscribeShipFromProfile(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    toObservable(this.authStore.user)
      .pipe(
        switchMap((user) => {
          if (!user?.id) {
            return of(undefined);
          }
          return this.userProfile.watchProfileData(user.id).pipe(catchError(() => of(undefined)));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((data) => {
        if (!data || typeof data !== 'object') {
          return;
        }
        this.patchShipFromProfileDoc(data as Record<string, unknown>);
        this.cdr.markForCheck();
      });
  }

  private patchShipFromProfileDoc(d: Record<string, unknown>): void {
    const inv = this.form.controls.invoice;
    if (String(inv.get('fromGstin')?.value ?? '').trim().length === 15) {
      return;
    }

    const gstin = pickProfileString(d, [
      'tinGstNo',
      'GSTIN',
      'gstin',
      'organizationGstin',
      'Gstin',
    ]).toUpperCase();

    const lgl = pickProfileString(d, [
      'organizationName',
      'tradeNam',
      'lgnm',
      'name',
      'legalName',
      'LglNm',
    ]);
    const addr = pickProfileString(d, ['organizationAddress', 'address', 'Addr1']);
    const loc = pickProfileString(d, ['organizationCity', 'city', 'Loc']);
    const pinRaw = pickProfileString(d, [
      'organizationPincode',
      'pincode',
      'Pin',
      'PIN',
    ]).replace(/\D/g, '');
    const pin = pinRaw.slice(0, 6);
    let stcd = pickProfileString(d, ['organizationStateCode', 'stateCode', 'Stcd']);
    if (stcd.length > 2) {
      stcd = stcd.slice(0, 2);
    }
    if ((!stcd || !/^\d{2}$/.test(stcd)) && gstin.length >= 2) {
      stcd = gstin.slice(0, 2);
    }
    const stNum = /^\d{2}$/.test(stcd) ? parseInt(stcd, 10) : null;

    if (
      gstin.length !== 15 &&
      !lgl &&
      !addr &&
      !pin &&
      stNum == null &&
      !loc
    ) {
      return;
    }

    const patch: Record<string, string | number | null> = {};
    if (gstin.length === 15) {
      patch['fromGstin'] = gstin;
    }
    if (lgl) {
      patch['fromTrdName'] = lgl;
    }
    if (addr) {
      patch['fromAddr1'] = addr;
    }
    if (loc) {
      patch['fromPlace'] = loc;
    }
    if (/^\d{6}$/.test(pin)) {
      patch['fromPincode'] = pin;
    }
    if (stNum != null && Number.isFinite(stNum)) {
      patch['fromStateCode'] = stNum;
    }
    inv.patchValue(patch, { emitEvent: true });
  }
}

function pickProfileString(
  document: Record<string, unknown>,
  keys: readonly string[],
): string {
  for (const k of keys) {
    const v = document[k];
    if (v != null && String(v).trim() !== '') {
      return String(v).trim();
    }
  }
  return '';
}
