import { DecimalPipe, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { AuthStore } from '@ramsoft-builder/auth/data-access/auth';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  EinvoiceStore,
  ProductCatalogRepository,
  UserProfileRepository,
} from '@ramsoft-builder/e-invoices/data-access/einvoice';
import { EinvoiceInlineAlertComponent } from '@ramsoft-builder/e-invoices/ui/form';
import { ToWords } from 'to-words';
import { catchError, debounceTime, map, merge, of, switchMap } from 'rxjs';
import {
  mapCreateEinvoiceFormToRequest,
  type CreateEinvoiceFormValue,
} from '../create-einvoice-map-request';
import { INDIAN_GST_STATES } from '../indian-states';
import {
  gstinValidator,
  pinIndiaValidator,
  vehicleNoEwbValidators,
} from '../gstin.validators';
import type { EinvoiceVarietyOption } from '../einvoice-variety-option';

/** Legacy usaccounting transport / vehicle options. */
const TRANSPORT_MODES: { name: string; value: string }[] = [
  { name: 'Road', value: '1' },
  { name: 'Rail', value: '2' },
  { name: 'Air', value: '3' },
  { name: 'Ship', value: '4' },
];

const VEHICLE_TYPES: { name: string; value: string }[] = [
  { name: 'Regular', value: 'R' },
  { name: 'ODC (Over Dimensional Cargo)', value: 'O' },
];

/** Charge names for Add/Less rows (replaces Firestore `accountHeads`). */
export const EINVOICE_CHARGE_HEADS: string[] = [
  'TCS',
  'Freight',
  'Insurance',
  'Packing',
  'Loading',
  'Handling',
  'Other',
];

@Component({
  standalone: true,
  selector: 'lib-create-einvoice-page',
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    RouterLink,
    EinvoiceInlineAlertComponent,
  ],
  templateUrl: './create-einvoice.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateEinvoicePageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly einvoiceStore = inject(EinvoiceStore);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly productCatalog = inject(ProductCatalogRepository);
  private readonly userProfile = inject(UserProfileRepository);
  private readonly authStore = inject(AuthStore);
  private readonly platformId = inject(PLATFORM_ID);

  /** Public GSTIN search (legacy usaccounting); replace with your own proxy in production. */
  private static readonly GSTIN_LOOKUP_BASE =
    'https://searchtaxpayer-3syvsriwua-uc.a.run.app';
  /** Required query param on that endpoint (see `createeinvoice.component.ts` `checkGSTIN`). */
  private static readonly GSTIN_LOOKUP_EMAIL = 'ajay.a02@gmail.com';

  readonly states = INDIAN_GST_STATES;
  readonly transportModes = TRANSPORT_MODES;
  readonly vehicleTypes = VEHICLE_TYPES;
  readonly chargeHeads = EINVOICE_CHARGE_HEADS;

  /**
   * Optional override (e.g. tests / host binding). When empty, Variety options load from Firestore `products`
   * for the signed-in user (same as legacy Handsontable `dropdown` source).
   */
  readonly varieties = input<EinvoiceVarietyOption[]>([]);

  /** Loaded from Firestore when `varieties` input is not provided. */
  private readonly firestoreVarietyCatalog = signal<EinvoiceVarietyOption[]>([]);

  /** Effective master list for the Variety column (`input` overrides Firestore catalog). */
  readonly varietyCatalog = computed(() => {
    const injected = this.varieties();
    if (injected.length > 0) {
      return injected;
    }
    return this.firestoreVarietyCatalog();
  });

  /** Labels for the Variety column `<select>` (distinct `productName` values). */
  readonly varietyDatalistLabels = computed(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const v of this.varietyCatalog()) {
      const n = v.productName?.trim();
      if (!n || seen.has(n)) continue;
      seen.add(n);
      out.push(n);
    }
    return out.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  });

  /** Legacy-style single pick + amount before pushing into `extraParameters`. */
  readonly quickChargeName = this.fb.control<string>('', { nonNullable: true });
  readonly quickChargeAmount = this.fb.control<number>(0, { nonNullable: true });

  readonly isInterState = signal(false);
  readonly taxTypeLabel = signal('Intra Tax Sales');
  readonly parameterAction = signal<'Add' | 'Less'>('Add');
  readonly amountInWords = signal<string | null>(null);
  readonly gstLoading = signal(false);
  /** Client-side validation messages when Submit is blocked (`form.invalid` after markAllAsTouched). */
  readonly formValidationHints = signal<string | null>(null);
  /** Row used for HSN vs SAC column title (focus or last edited). */
  readonly focusedItemIndex = signal(0);

  private readonly toWords = new ToWords({
    localeCode: 'en-IN',
    converterOptions: {
      currency: true,
      ignoreDecimal: false,
      ignoreZeroCurrency: false,
    },
  });

  readonly form = this.fb.group({
    tran: this.fb.group({
      TaxSch: ['GST', Validators.required],
      SupTyp: ['B2B', Validators.required],
      RegRev: ['N', Validators.required],
      IgstOnIntra: ['N', Validators.required],
      EcmGstin: [''],
    }),
    doc: this.fb.group({
      Typ: ['INV', Validators.required],
      No: ['', Validators.required],
      Dt: ['', Validators.required],
    }),
    seller: this.fb.group({
      Gstin: ['', [Validators.required, gstinValidator(false)]],
      LglNm: ['', Validators.required],
      TrdNm: [''],
      Addr1: ['', Validators.required],
      Addr2: [''],
      Loc: ['', Validators.required],
      Pin: ['', [Validators.required, pinIndiaValidator]],
      Stcd: ['', [Validators.required, Validators.pattern(/^\d{2}$/)]],
      Ph: [''],
      Em: [''],
    }),
    buyer: this.fb.group({
      Gstin: ['', [Validators.required, gstinValidator(false)]],
      LglNm: ['', Validators.required],
      TrdNm: [''],
      Pos: ['', [Validators.required, Validators.pattern(/^\d{2}$/)]],
      Addr1: ['', Validators.required],
      Addr2: [''],
      Loc: ['', Validators.required],
      Pin: ['', [Validators.required, pinIndiaValidator]],
      Stcd: ['', [Validators.required, Validators.pattern(/^\d{2}$/)]],
      Ph: [''],
      Em: [''],
    }),
    ship: this.fb.group({
      sameShipping: [true],
      Gstin: [''],
      LglNm: [''],
      TrdNm: [''],
      Addr1: [''],
      Addr2: [''],
      Loc: [''],
      Pin: [''],
      Stcd: [''],
      Ph: [''],
      Em: [''],
    }),
    disp: this.fb.group({
      Nm: [''],
      Addr1: [''],
      Addr2: [''],
      Loc: [''],
      Pin: [''],
      Stcd: [''],
    }),
    val: this.fb.group({
      AssVal: [{ value: 0, disabled: true }],
      CgstVal: [{ value: 0, disabled: true }],
      SgstVal: [{ value: 0, disabled: true }],
      IgstVal: [{ value: 0, disabled: true }],
      CesVal: [{ value: 0, disabled: true }],
      StCesVal: [{ value: 0, disabled: true }],
      Discount: [0],
      OthChrg: [0],
      RndOffAmt: [0],
      TotInvVal: [{ value: 0, disabled: true }],
      OtherChargesDetails: [0],
    }),
    percentage: [0],
    extraParameters: this.fb.array<FormGroup>([]),
    extraPayloadParams: this.fb.array<FormGroup>([]),
    pay: this.fb.group({
      Nm: [''],
      Accdet: [''],
      Mode: [''],
      Fininsbr: [''],
      Payterm: [''],
      Payinstr: [''],
      Crtrn: [''],
      Dirdr: [''],
      Crday: [''],
      Paidamt: [''],
      PaymtDue: [''],
    }),
    items: this.fb.array([this.createItemGroup()]),
    ewayEnabled: [false],
    ewb: this.fb.group({
      TransId: [''],
      TransMode: ['1'],
      Distance: [0],
      VehNo: [''],
      VehType: ['R'],
      TransDocNo: [''],
      TransDocDt: [''],
    }),
  });

  constructor() {
    this.wireTaxTypeAndRecalc();
    this.wireSameShipping();
    this.wireBuyerStateToPos();
    this.wireEwayValidators();
    this.wireExtraParametersRecalc();
    this.wireValManualOthRecalc();
    this.subscribeFirestoreProductVarieties();
    this.subscribeFirestoreSellerProfile();
  }

  /** Legacy `products` collection → Handsontable-style dropdown source (browser only). */
  private subscribeFirestoreProductVarieties(): void {
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
        this.firestoreVarietyCatalog.set(list);
        this.cdr.markForCheck();
      });
  }

  /** Optional `users/{uid}` organisation fields (legacy usaccounting naming). Patches seller when GSTIN empty. */
  private subscribeFirestoreSellerProfile(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    toObservable(this.authStore.user)
      .pipe(
        switchMap((user) => {
          if (!user?.id) {
            return of(undefined);
          }
          return this.userProfile.watchProfileData(user.id).pipe(
            catchError(() => of(undefined)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((data) => {
        if (!data || typeof data !== 'object') {
          return;
        }
        this.patchSellerFromProfileDoc(data as Record<string, unknown>);
        this.cdr.markForCheck();
      });
  }

  private patchSellerFromProfileDoc(d: Record<string, unknown>): void {
    const seller = this.form.controls.seller;
    if (String(seller.controls.Gstin.value ?? '').trim().length === 15) {
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
    const trd = pickProfileString(d, ['tradeNam', 'TrdNm', 'trademark']);
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

    if (
      gstin.length !== 15 &&
      !lgl &&
      !addr &&
      !pin &&
      !stcd &&
      !loc
    ) {
      return;
    }

    const patch: Record<string, string> = {};
    if (gstin.length === 15) {
      patch['Gstin'] = gstin;
    }
    if (lgl) {
      patch['LglNm'] = lgl;
    }
    if (trd || lgl) {
      patch['TrdNm'] = trd || lgl;
    }
    if (addr) {
      patch['Addr1'] = addr;
    }
    if (loc) {
      patch['Loc'] = loc;
    }
    if (/^\d{6}$/.test(pin)) {
      patch['Pin'] = pin;
    }
    if (/^\d{2}$/.test(stcd)) {
      patch['Stcd'] = stcd;
    }
    const mail = pickProfileString(d, ['email', 'organizationEmail']);
    const ph = pickProfileString(d, ['organizationPhone', 'phone', 'Ph']);
    if (mail.includes('@')) {
      patch['Em'] = mail;
    }
    if (ph) {
      patch['Ph'] = ph;
    }

    seller.patchValue(patch, { emitEvent: true });
  }

  get items(): FormArray {
    return this.form.controls.items;
  }

  get extraParameters(): FormArray {
    return this.form.controls.extraParameters;
  }

  get extraPayloadParams(): FormArray {
    return this.form.controls.extraPayloadParams;
  }

  extraParamAt(i: number): FormGroup {
    return this.extraParameters.at(i) as FormGroup;
  }

  createExtraParamGroup(type: 'Add' | 'Less' = 'Add'): FormGroup {
    return this.fb.group({
      type: this.fb.nonNullable.control(type),
      parameter: ['', Validators.required],
      value: [0, [Validators.required]],
    });
  }

  addExtraChargeRow(): void {
    this.extraParameters.push(this.createExtraParamGroup(this.parameterAction()));
  }

  /** Add/Less tab + charge select + amount (matches legacy usaccounting UX). */
  addQuickExtraCharge(): void {
    const name = this.quickChargeName.value?.trim();
    if (!name) {
      return;
    }
    const row = this.createExtraParamGroup(this.parameterAction());
    row.patchValue({
      parameter: name,
      value: this.num(this.quickChargeAmount.value),
    });
    this.extraParameters.push(row);
    this.quickChargeName.setValue('');
    this.quickChargeAmount.setValue(0);
    this.recalculateAll();
    this.cdr.markForCheck();
  }

  createExtraPayloadRow(): FormGroup {
    return this.fb.group({
      parameter: [''],
      value: [''],
    });
  }

  addExtraPayloadRow(): void {
    this.extraPayloadParams.push(this.createExtraPayloadRow());
  }

  removeExtraPayloadRow(index: number): void {
    this.extraPayloadParams.removeAt(index);
  }

  removeExtraChargeRow(index: number): void {
    this.extraParameters.removeAt(index);
    this.recalculateAll();
  }

  createItemGroup(): FormGroup {
    return this.fb.group({
      ItemNo: [0],
      SlNo: this.fb.nonNullable.control('1'),
      IsServc: this.fb.nonNullable.control('N'),
      PrdDesc: ['', Validators.required],
      HsnCd: [
        '',
        [Validators.required, Validators.minLength(4), Validators.maxLength(8)],
      ],
      Barcde: [''],
      Brand: [''],
      Bags: [0],
      UnitType: [0],
      Qty: [0, [Validators.required, Validators.min(0.000_001)]],
      FreeQty: [0, [Validators.min(0)]],
      /** UOM string for NIC; legacy table only showed `UnitType` / qty in Qtls — default matches Quantity (Qtls). */
      Unit: ['QTL', Validators.required],
      rate: [0],
      UnitPrice: [0, [Validators.required, Validators.min(0)]],
      GstRt: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      Discount: [0],
      PreTaxVal: [{ value: 0, disabled: true }],
      AssAmt: [{ value: 0, disabled: true }],
      TotAmt: [{ value: 0, disabled: true }],
      IgstAmt: [{ value: 0, disabled: true }],
      CgstAmt: [{ value: 0, disabled: true }],
      SgstAmt: [{ value: 0, disabled: true }],
      CesRt: [0],
      CesAmt: [0],
      CesNonAdvlAmt: [0],
      StateCesRt: [0],
      StateCesAmt: [0],
      StateCesNonAdvlAmt: [0],
      OthChrg: [0],
      TotItemVal: [{ value: 0, disabled: true }],
      BchNm: [''],
      BchExpDt: [''],
      BchWrDt: [''],
    });
  }

  addItemRow(): void {
    this.items.push(this.createItemGroup());
    this.reindexItems();
    this.recalculateAll();
  }

  removeItemRow(index: number): void {
    if (this.items.length <= 1) {
      return;
    }
    this.items.removeAt(index);
    this.reindexItems();
    this.recalculateAll();
  }

  private reindexItems(): void {
    this.items.controls.forEach((ctrl, i) => {
      const g = ctrl as FormGroup;
      g.get('SlNo')?.setValue(String(i + 1), { emitEvent: false });
      g.get('ItemNo')?.setValue(i + 1, { emitEvent: false });
    });
  }

  private wireTaxTypeAndRecalc(): void {
    const seller = this.form.controls.seller;
    const buyer = this.form.controls.buyer;
    const items = this.items;

    const taxStreams = merge(
      seller.controls.Stcd.valueChanges,
      buyer.controls.Stcd.valueChanges,
      buyer.controls.Pos.valueChanges,
    );

    taxStreams
      .pipe(debounceTime(0), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.updateInterState());

    const val = this.form.controls.val;
    merge(
      items.valueChanges,
      val.controls.Discount.valueChanges,
      val.controls.OthChrg.valueChanges,
      val.controls.RndOffAmt.valueChanges,
      val.controls.CesVal.valueChanges,
      val.controls.StCesVal.valueChanges,
      val.controls.OtherChargesDetails.valueChanges,
    )
      .pipe(debounceTime(0), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.recalculateAll());

    this.form.controls.buyer.valueChanges
      .pipe(debounceTime(0), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.form.controls.ship.get('sameShipping')?.value) {
          this.applyShipFromBuyer();
        }
      });

    this.updateInterState();
    this.recalculateAll();
  }

  private wireExtraParametersRecalc(): void {
    this.extraParameters.valueChanges
      .pipe(debounceTime(0), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.recalculateAll());
  }

  private wireValManualOthRecalc(): void {
    this.form.controls.val.controls.OthChrg.valueChanges
      .pipe(debounceTime(0), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.recalculateAll());
    this.form.controls.percentage.valueChanges
      .pipe(debounceTime(0), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.recalculateAll());
  }

  /** Sum of line `TotAmt` (taxable after line discount) before header `val.Discount`. */
  private sumLineTaxableBeforeValDiscount(): number {
    let s = 0;
    this.items.controls.forEach((ctrl) => {
      s += this.num((ctrl as FormGroup).get('TotAmt')?.value);
    });
    return s;
  }

  private readonly shipPartyKeys = [
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
  ] as const;

  private setShipPartyFieldsDisabled(same: boolean): void {
    const ship = this.form.controls.ship;
    for (const k of this.shipPartyKeys) {
      const c = ship.get(k);
      if (!c) continue;
      if (same) {
        c.disable({ emitEvent: false });
      } else {
        c.enable({ emitEvent: false });
      }
    }
  }

  private wireSameShipping(): void {
    const ship = this.form.controls.ship;
    ship.controls.sameShipping.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((same) => {
        this.updateShipPartyValidators(Boolean(same));
        this.setShipPartyFieldsDisabled(Boolean(same));
        if (same) {
          this.applyShipFromBuyer();
        }
      });
    const sameInit = Boolean(ship.controls.sameShipping.value);
    this.updateShipPartyValidators(sameInit);
    this.setShipPartyFieldsDisabled(sameInit);
    this.applyShipFromBuyer();
  }

  private updateShipPartyValidators(sameAsBuyer: boolean): void {
    const ship = this.form.controls.ship;
    const gstin = ship.controls.Gstin;
    const lgl = ship.controls.LglNm;
    const addr = ship.controls.Addr1;
    const loc = ship.controls.Loc;
    const pin = ship.controls.Pin;
    const stcd = ship.controls.Stcd;

    if (sameAsBuyer) {
      gstin.clearValidators();
      lgl.clearValidators();
      addr.clearValidators();
      loc.clearValidators();
      pin.clearValidators();
      stcd.clearValidators();
    } else {
      gstin.setValidators([Validators.required, gstinValidator(false)]);
      lgl.setValidators([Validators.required]);
      addr.setValidators([Validators.required]);
      loc.setValidators([Validators.required]);
      pin.setValidators([Validators.required, pinIndiaValidator]);
      stcd.setValidators([Validators.required, Validators.pattern(/^\d{2}$/)]);
    }

    for (const c of [gstin, lgl, addr, loc, pin, stcd]) {
      c.updateValueAndValidity({ emitEvent: false });
    }
  }

  private wireBuyerStateToPos(): void {
    this.form.controls.buyer.controls.Stcd.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((st) => {
        if (st && /^\d{2}$/.test(String(st))) {
          this.form.controls.buyer.controls.Pos.setValue(String(st), {
            emitEvent: true,
          });
        }
        this.updateInterState();
      });
  }

  private wireEwayValidators(): void {
    const veh = this.form.controls.ewb.controls.VehNo;
    this.form.controls.ewayEnabled.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((on) => {
        if (on) {
          veh.setValidators(vehicleNoEwbValidators);
        } else {
          veh.clearValidators();
        }
        veh.updateValueAndValidity({ emitEvent: false });
      });
  }

  private applyShipFromBuyer(): void {
    if (!this.form.controls.ship.get('sameShipping')?.value) {
      return;
    }
    const b = this.form.controls.buyer;
    const s = this.form.controls.ship;
    (
      [
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
      ] as const
    ).forEach((k) => {
      s.get(k)?.setValue(b.get(k)?.value ?? '', { emitEvent: false });
    });
  }

  private updateInterState(): void {
    const sSt = this.form.controls.seller.get('Stcd')?.value?.toString() ?? '';
    const bSt =
      this.form.controls.buyer.get('Pos')?.value?.toString() ||
      this.form.controls.buyer.get('Stcd')?.value?.toString() ||
      '';
    const inter = Boolean(sSt && bSt && sSt !== bSt);
    this.isInterState.set(inter);
    this.taxTypeLabel.set(inter ? 'Inter Tax Sales' : 'Intra Tax Sales');
    this.recalculateAll();
  }

  private recalculateAll(): void {
    const inter = this.isInterState();
    this.items.controls.forEach((ctrl) => {
      this.recalculateRow(ctrl as FormGroup, inter);
    });
    this.aggregateValFromItems();
    this.cdr.markForCheck();
  }

  private recalculateRow(row: FormGroup, inter: boolean): void {
    const qtyInput = this.num(row.get('Qty')?.value);
    const bags = this.num(row.get('Bags')?.value);
    const unitType = this.num(row.get('UnitType')?.value);
    const qtyFromBags =
      bags > 0 && unitType > 0 ? Math.round(((bags * unitType) / 100) * 1000) / 1000 : null;
    const qty =
      qtyFromBags !== null && qtyFromBags > 0 ? qtyFromBags : qtyInput;
    if (qtyFromBags !== null && qtyFromBags > 0) {
      row.patchValue({ Qty: qty }, { emitEvent: false });
    }

    const gstRt = this.num(row.get('GstRt')?.value);
    const rate = this.num(row.get('rate')?.value);
    let unitPrice = this.num(row.get('UnitPrice')?.value);
    if (rate > 0 && gstRt >= 0) {
      unitPrice =
        Math.round((rate - (rate * gstRt) / (100 + gstRt)) * 100) / 100;
      row.patchValue({ UnitPrice: unitPrice }, { emitEvent: false });
    }

    const lineDisc = this.num(row.get('Discount')?.value);
    const taxableBase = Math.max(0, Math.round(qty * unitPrice - lineDisc));

    let igst = 0;
    let cgst = 0;
    let sgst = 0;
    if (inter) {
      igst = Math.round((taxableBase * gstRt) / 100);
    } else {
      const half = Math.round((taxableBase * (gstRt / 2)) / 100);
      cgst = half;
      sgst = half;
    }

    const cesAmt = this.num(row.get('CesAmt')?.value);
    const stCesAmt = this.num(row.get('StateCesAmt')?.value);
    const lineOth = this.num(row.get('OthChrg')?.value);
    const totItem = Math.round(
      taxableBase + igst + cgst + sgst + cesAmt + stCesAmt + lineOth,
    );

    row.patchValue(
      {
        AssAmt: taxableBase,
        TotAmt: taxableBase,
        PreTaxVal: taxableBase,
        IgstAmt: igst,
        CgstAmt: cgst,
        SgstAmt: sgst,
        TotItemVal: totItem,
      },
      { emitEvent: false },
    );
  }

  private aggregateValFromItems(): void {
    let ass = 0;
    let igst = 0;
    let cgst = 0;
    let sgst = 0;
    const inter = this.isInterState();
    this.items.controls.forEach((ctrl) => {
      const g = ctrl as FormGroup;
      ass += this.num(g.get('TotAmt')?.value);
      igst += this.num(g.get('IgstAmt')?.value);
      cgst += this.num(g.get('CgstAmt')?.value);
      sgst += this.num(g.get('SgstAmt')?.value);
    });
    const discount = this.num(this.form.controls.val.get('Discount')?.value);
    const manualOth = this.num(this.form.controls.val.get('OthChrg')?.value);
    const rnd = this.num(this.form.controls.val.get('RndOffAmt')?.value);
    const ces = this.num(this.form.controls.val.get('CesVal')?.value);
    const stCes = this.num(this.form.controls.val.get('StCesVal')?.value);
    const otherDetailsInput = this.num(
      this.form.controls.val.get('OtherChargesDetails')?.value,
    );
    const pct = this.num(this.form.controls.percentage.value);
    const lineSum = this.sumLineTaxableBeforeValDiscount();
    const otherFromPct =
      pct > 0 ? Math.round(((lineSum * pct) / 100) * 100) / 100 : otherDetailsInput;

    let extraAdj = 0;
    for (let i = 0; i < this.extraParameters.length; i++) {
      const g = this.extraParameters.at(i) as FormGroup;
      const t = g.get('type')?.value;
      const v = this.num(g.get('value')?.value);
      if (t === 'Less') {
        extraAdj -= v;
      } else {
        extraAdj += v;
      }
    }

    const taxable = Math.max(0, ass - discount);
    let tot = 0;
    if (inter) {
      tot =
        taxable +
        otherFromPct +
        extraAdj +
        manualOth +
        igst +
        ces +
        stCes +
        rnd;
      this.form.controls.val.patchValue(
        {
          AssVal: taxable,
          IgstVal: igst,
          CgstVal: 0,
          SgstVal: 0,
          CesVal: ces,
          StCesVal: stCes,
          TotInvVal: Math.round(tot * 100) / 100,
          OtherChargesDetails: otherFromPct,
        },
        { emitEvent: false },
      );
    } else {
      tot =
        taxable +
        otherFromPct +
        extraAdj +
        manualOth +
        cgst +
        sgst +
        ces +
        stCes +
        rnd;
      this.form.controls.val.patchValue(
        {
          AssVal: taxable,
          IgstVal: 0,
          CgstVal: cgst,
          SgstVal: sgst,
          CesVal: ces,
          StCesVal: stCes,
          TotInvVal: Math.round(tot * 100) / 100,
          OtherChargesDetails: otherFromPct,
        },
        { emitEvent: false },
      );
    }
    this.updateAmountInWords();
  }

  private updateAmountInWords(): void {
    const n = this.num(this.form.controls.val.get('TotInvVal')?.value);
    if (n > 0) {
      try {
        this.amountInWords.set(this.toWords.convert(n));
      } catch {
        this.amountInWords.set(null);
      }
    } else {
      this.amountInWords.set(null);
    }
  }

  private num(v: unknown): number {
    if (v === null || v === undefined || v === '') {
      return 0;
    }
    const n = typeof v === 'number' ? v : Number.parseFloat(String(v));
    return Number.isFinite(n) ? n : 0;
  }

  readonly store: EinvoiceStore = this.einvoiceStore;

  focusItemRow(index: number): void {
    this.focusedItemIndex.set(index);
    this.cdr.markForCheck();
  }

  /** When Variety (`PrdDesc`) matches a catalog row, fill HSN/SAC and related fields (legacy Handsontable). */
  onItemVarietyChange(rowIndex: number): void {
    const row = this.items.at(rowIndex) as FormGroup | undefined;
    if (!row) {
      return;
    }
    const prd = this.itemRowPrdDescTrim(rowIndex);
    if (!prd) {
      row.patchValue({ HsnCd: '', IsServc: 'N', GstRt: 0 }, { emitEvent: true });
      this.focusItemRow(rowIndex);
      this.recalculateAll();
      this.cdr.markForCheck();
      return;
    }
    const product = this.varietyCatalog().find(
      (p) => (p.productName ?? '').trim() === prd,
    );
    if (!product) {
      this.focusItemRow(rowIndex);
      this.cdr.markForCheck();
      return;
    }

    const isService =
      product.itemType?.toLowerCase() === 'service' ||
      product.IsServc === 'Y';

    const inter = this.isInterState();
    const gstRt = inter
      ? this.num(product.igst)
      : this.num(product.cgst) + this.num(product.sgst);

    const patch: Record<string, unknown> = {
      PrdDesc: (product.productName ?? prd).trim(),
      HsnCd: String(product.hsnCode ?? '').trim(),
      IsServc: isService ? 'Y' : 'N',
      GstRt: gstRt,
    };

    const units = product.units != null ? String(product.units).trim() : '';
    if (units) {
      patch['Unit'] = units;
    }
    if (product.unitType !== undefined && product.unitType !== null) {
      patch['UnitType'] = this.num(product.unitType);
    }
    if (product.bags !== undefined && product.bags !== null) {
      patch['Bags'] = this.num(product.bags);
    }

    row.patchValue(patch, { emitEvent: true });
    this.focusItemRow(rowIndex);
    this.recalculateAll();
    this.cdr.markForCheck();
  }

  /** Labels for `<select>` options = master `productName`s plus current row value if not in master. */
  itemVarietySelectOptionLabels(rowIndex: number): string[] {
    const base = [...this.varietyDatalistLabels()];
    const cur = this.itemRowPrdDescTrim(rowIndex);
    if (cur && !base.includes(cur)) {
      base.unshift(cur);
    }
    return base;
  }

  /** HSN/SAC read-only only when this row’s variety name resolves to the catalog (legacy read-only column). */
  itemRowHsnReadonly(rowIndex: number): boolean {
    if (this.varietyCatalog().length === 0) {
      return false;
    }
    const prd = this.itemRowPrdDescTrim(rowIndex);
    return this.varietyCatalog().some((p) => (p.productName ?? '').trim() === prd);
  }

  private itemRowPrdDescTrim(rowIndex: number): string {
    const row = this.items.at(rowIndex) as FormGroup | undefined;
    return String(row?.get('PrdDesc')?.value ?? '').trim();
  }

  itemHsnHeader(): string {
    const i = this.focusedItemIndex();
    const row = this.items.at(i) as FormGroup | undefined;
    const isServ = row?.get('IsServc')?.value === 'Y';
    return isServ ? 'SAC Code' : 'HSN Code';
  }

  /** Read-only line amounts (still backed by form controls for NIC mapping). */
  itemAmount(rowIndex: number, controlName: string): number {
    const g = this.items.at(rowIndex) as FormGroup | undefined;
    return this.num(g?.get(controlName)?.value);
  }

  setParameterAction(action: 'Add' | 'Less'): void {
    this.parameterAction.set(action);
  }

  setRegRevFromCheckbox(checked: boolean): void {
    this.form.controls.tran.controls.RegRev.setValue(checked ? 'Y' : 'N');
  }

  onReverseChargeCheckboxChange(event: Event): void {
    const el = event.target as HTMLInputElement | null;
    if (el) {
      this.setRegRevFromCheckbox(el.checked);
    }
  }

  checkBuyerGstin(): void {
    if (this.gstLoading()) {
      return;
    }
    const gstin = String(this.form.controls.buyer.get('Gstin')?.value ?? '')
      .trim()
      .toUpperCase();
    if (gstin.length !== 15) {
      return;
    }
    this.gstLoading.set(true);
    const q = new URLSearchParams({
      gstin,
      email: CreateEinvoicePageComponent.GSTIN_LOOKUP_EMAIL,
    });
    const url = `${CreateEinvoicePageComponent.GSTIN_LOOKUP_BASE}?${q.toString()}`;
    this.http.get<GstSearchTaxpayerResponse>(url).subscribe({
      next: (res) => {
        if (res && !res.error && res.data) {
          this.patchBuyerFromGstSearch(res.data);
        } else {
          this.resetBuyerGstSearchFields();
        }
      },
      error: () => {
        this.resetBuyerGstSearchFields();
      },
      complete: () => {
        this.gstLoading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  private patchBuyerFromGstSearch(data: GstSearchTaxpayerData): void {
    const addr = data.pradr?.addr;
    const pin = addr?.pncd ? String(addr.pncd).replace(/\D/g, '').slice(0, 6) : '';
    const buyer = this.form.controls.buyer;
    buyer.patchValue({
      Gstin: data.gstin?.trim() ?? '',
      LglNm: data.tradeNam?.trim() || data.lgnm?.trim() || '',
      Addr1: [addr?.bno, addr?.st].filter(Boolean).join(', '),
      Loc: addr?.loc ?? '',
      Pin: pin,
      Stcd: data.gstin?.trim().slice(0, 2) ?? '',
      Pos: data.gstin?.trim().slice(0, 2) ?? '',
    });
    if (this.form.controls.ship.get('sameShipping')?.value) {
      this.applyShipFromBuyer();
    }
    this.updateInterState();
    this.cdr.markForCheck();
  }

  private resetBuyerGstSearchFields(): void {
    this.form.controls.buyer.patchValue({
      LglNm: '',
      Addr1: '',
      Loc: '',
      Pin: '',
      Stcd: '',
      Pos: '',
    });
    this.cdr.markForCheck();
  }

  async submit(): Promise<void> {
    this.einvoiceStore.dismissSubmissionError();
    this.formValidationHints.set(null);
    this.form.markAllAsTouched();
    if (this.form.controls.ship.get('sameShipping')?.value) {
      this.applyShipFromBuyer();
    }
    if (this.form.invalid) {
      this.formValidationHints.set(this.buildValidationSummary());
      this.cdr.markForCheck();
      return;
    }
    const raw = this.form.getRawValue() as CreateEinvoiceFormValue;
    const body = mapCreateEinvoiceFormToRequest(raw);
    try {
      await this.einvoiceStore.createInvoice(body);
    } catch {
      /* error surfaced via store */
    } finally {
      this.cdr.markForCheck();
    }
  }

  newInvoice(): void {
    this.formValidationHints.set(null);
    this.einvoiceStore.reset();
    this.extraParameters.clear();
    this.extraPayloadParams.clear();
    this.form.reset({
      tran: {
        TaxSch: 'GST',
        SupTyp: 'B2B',
        RegRev: 'N',
        IgstOnIntra: 'N',
        EcmGstin: '',
      },
      doc: { Typ: 'INV', No: '', Dt: '' },
      seller: {
        Gstin: '',
        LglNm: '',
        TrdNm: '',
        Addr1: '',
        Addr2: '',
        Loc: '',
        Pin: '',
        Stcd: '',
        Ph: '',
        Em: '',
      },
      buyer: {
        Gstin: '',
        LglNm: '',
        TrdNm: '',
        Pos: '',
        Addr1: '',
        Addr2: '',
        Loc: '',
        Pin: '',
        Stcd: '',
        Ph: '',
        Em: '',
      },
      ship: {
        sameShipping: true,
        Gstin: '',
        LglNm: '',
        TrdNm: '',
        Addr1: '',
        Addr2: '',
        Loc: '',
        Pin: '',
        Stcd: '',
        Ph: '',
        Em: '',
      },
      disp: { Nm: '', Addr1: '', Addr2: '', Loc: '', Pin: '', Stcd: '' },
      val: {
        AssVal: 0,
        CgstVal: 0,
        SgstVal: 0,
        IgstVal: 0,
        CesVal: 0,
        StCesVal: 0,
        Discount: 0,
        OthChrg: 0,
        RndOffAmt: 0,
        TotInvVal: 0,
        OtherChargesDetails: 0,
      },
      percentage: 0,
      pay: {
        Nm: '',
        Accdet: '',
        Mode: '',
        Fininsbr: '',
        Payterm: '',
        Payinstr: '',
        Crtrn: '',
        Dirdr: '',
        Crday: '',
        Paidamt: '',
        PaymtDue: '',
      },
      items: [],
      ewayEnabled: false,
      ewb: {
        TransId: '',
        TransMode: '1',
        Distance: 0,
        VehNo: '',
        VehType: 'R',
        TransDocNo: '',
        TransDocDt: '',
      },
    });
    this.items.clear();
    this.items.push(this.createItemGroup());
    this.reindexItems();
    this.setShipPartyFieldsDisabled(
      Boolean(this.form.controls.ship.controls.sameShipping.value),
    );
    this.updateShipPartyValidators(
      Boolean(this.form.controls.ship.controls.sameShipping.value),
    );
    this.applyShipFromBuyer();
    this.updateInterState();
    this.updateAmountInWords();
  }

  private buildValidationSummary(): string {
    const paths = collectInvalidLeaves(this.form);
    if (paths.length === 0) {
      return 'Could not submit — please check seller, buyer, invoice details, e-waybill fields if enabled, and every line item.';
    }
    const labels = [...new Set(paths.map(fieldPathToHint))];
    const max = 12;
    const shown = labels.slice(0, max);
    let msg = shown.join('; ');
    if (labels.length > max) {
      msg += '; …';
    }
    return msg;
  }

  async goHome(): Promise<void> {
    await this.router.navigateByUrl('/home');
  }
}

const ITEM_LINE_FIELD_LABELS: Record<string, string> = {
  PrdDesc: 'Variety / description',
  HsnCd: 'HSN or SAC code',
  Qty: 'Quantity',
  Unit: 'Unit (UOM)',
  UnitPrice: 'Rate (excl. GST)',
  rate: 'MRP / inclusive rate',
  GstRt: 'GST %',
  Bags: 'Bags',
  UnitType: 'Unit factor',
};

const STATIC_FORM_HINTS: Record<string, string> = {
  'doc.No': 'Invoice number',
  'doc.Dt': 'Invoice date',
  'seller.Gstin': 'Seller GSTIN',
  'seller.LglNm': 'Seller legal name',
  'seller.Addr1': 'Seller address',
  'seller.Loc': 'Seller place',
  'seller.Pin': 'Seller PIN code',
  'seller.Stcd': 'Seller state code',
  'buyer.Gstin': 'Buyer GSTIN',
  'buyer.LglNm': 'Buyer legal name',
  'buyer.Pos': 'Place of supply',
  'buyer.Addr1': 'Buyer address',
  'buyer.Loc': 'Buyer place',
  'buyer.Pin': 'Buyer PIN code',
  'buyer.Stcd': 'Buyer state code',
  'ship.Gstin': 'Ship-to GSTIN',
  'ship.LglNm': 'Ship-to name',
  'ship.Addr1': 'Ship-to address',
  'ship.Loc': 'Ship-to place',
  'ship.Pin': 'Ship-to PIN code',
  'ship.Stcd': 'Ship-to state code',
  'ewb.VehNo': 'E-waybill vehicle number',
  'ewb.TransMode': 'E-waybill transport mode',
  'ewb.VehType': 'E-waybill vehicle type',
};

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

function collectInvalidLeaves(control: AbstractControl, path = ''): string[] {
  if (control.disabled) {
    return [];
  }
  if (control.valid) {
    return [];
  }
  if (control instanceof FormGroup) {
    const nested = Object.entries(control.controls).flatMap(([key, child]) =>
      collectInvalidLeaves(child, path ? `${path}.${key}` : key),
    );
    return nested.length > 0 ? nested : path ? [path] : [];
  }
  if (control instanceof FormArray) {
    const nested = control.controls.flatMap((child, i) =>
      collectInvalidLeaves(child, `${path}[${i}]`),
    );
    return nested.length > 0 ? nested : path ? [path] : [];
  }
  return path ? [path] : [];
}

function fieldPathToHint(path: string): string {
  const item = /^items\[(\d+)]\.(\w+)$/.exec(path);
  if (item) {
    const line = Number.parseInt(item[1], 10) + 1;
    const sub =
      ITEM_LINE_FIELD_LABELS[item[2]] ?? item[2].replace(/([A-Z])/g, ' $1').trim();
    return `Line ${line}: ${sub}`;
  }
  const ep = /^extraParameters\[(\d+)]\.(parameter|value)$/.exec(path);
  if (ep) {
    return ep[2] === 'parameter'
      ? 'Other charge row: name required'
      : 'Other charge row: amount required';
  }
  if (STATIC_FORM_HINTS[path]) {
    return STATIC_FORM_HINTS[path];
  }
  return path.replace(/\./g, ' › ');
}

function mapFirestoreProductDocToVarietyOption(
  doc: Record<string, unknown>,
): EinvoiceVarietyOption {
  return {
    productName: String(doc['productName'] ?? '').trim(),
    hsnCode: doc['hsnCode'] as EinvoiceVarietyOption['hsnCode'],
    units:
      doc['units'] != null && doc['units'] !== ''
        ? String(doc['units']).trim()
        : undefined,
    unitType: firestoreNum(doc['unitType']),
    bags: firestoreNum(doc['bags']),
    itemType:
      doc['itemType'] != null ? String(doc['itemType']).trim() : undefined,
    IsServc:
      doc['IsServc'] != null ? String(doc['IsServc']).trim() : undefined,
    igst: firestoreNum(doc['igst']),
    cgst: firestoreNum(doc['cgst']),
    sgst: firestoreNum(doc['sgst']),
  };
}

function firestoreNum(v: unknown): number | undefined {
  if (v === null || v === undefined || v === '') {
    return undefined;
  }
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

interface GstSearchTaxpayerResponse {
  error?: boolean;
  message?: string;
  data: GstSearchTaxpayerData | null;
}

interface GstSearchTaxpayerData {
  gstin: string;
  tradeNam?: string;
  /** Present on some GST search payloads (legacy `GSTResponse` uses `lgnm`). */
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
