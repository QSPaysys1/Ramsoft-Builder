import { isPlatformBrowser } from '@angular/common';
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
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, type SafeUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthStore } from '@ramsoft-builder/auth/data-access/auth';
import {
  EinvoiceApiError,
  EinvoiceDocRepository,
  EinvoiceService,
  type EinvoiceLegacyDoc,
  UserProfileRepository,
} from '@ramsoft-builder/e-invoices/data-access/einvoice';
import { QRCodeComponent } from 'angularx-qrcode';
import { ToWords } from 'to-words';
import { catchError, combineLatest, firstValueFrom, from, map, of, switchMap } from 'rxjs';
import { INDIAN_GST_STATES, type IndianGstState } from '../../indian-states';
import {
  mapLegacyDocToEinvoiceView,
  type EinvoiceViewModel,
} from '../map-legacy-doc-to-einvoice-view';

function asRecord(v: unknown): Record<string, unknown> | undefined {
  return v != null && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : undefined;
}

function str(v: unknown): string {
  if (v == null) {
    return '';
  }
  return String(v).trim();
}

function pickProfileString(
  d: Record<string, unknown> | undefined,
  keys: string[],
): string {
  if (!d) {
    return '';
  }
  for (const k of keys) {
    const v = d[k];
    if (v != null && String(v).trim()) {
      return String(v).trim();
    }
  }
  return '';
}

function stateLabelFromStcd(code: unknown): string {
  const c = str(code);
  if (!/^\d{2}$/.test(c)) {
    return '—';
  }
  const s = INDIAN_GST_STATES.find((x: IndianGstState) => x.GSTStateCode === c);
  return s ? `${s.State} - ${c}` : `— - ${c}`;
}

type LoadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'error'; message: string };

@Component({
  standalone: true,
  selector: 'lib-einvoice-view-page',
  imports: [RouterLink, QRCodeComponent, ReactiveFormsModule],
  templateUrl: './einvoice-view.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EinvoiceViewPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly einvoiceDocs = inject(EinvoiceDocRepository);
  private readonly einvoiceService = inject(EinvoiceService);
  private readonly userProfile = inject(UserProfileRepository);
  private readonly authStore = inject(AuthStore);
  private readonly fb = inject(FormBuilder);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly toWords = new ToWords({
    localeCode: 'en-IN',
    converterOptions: {
      currency: true,
      ignoreDecimal: false,
      ignoreZeroCurrency: false,
    },
  });

  readonly rawDoc = signal<EinvoiceLegacyDoc | null>(null);
  readonly sheetAction = signal<'invoice' | 'Cancel'>('invoice');
  readonly cancelLoading = signal(false);
  readonly cancelUiError = signal<string | null>(null);

  readonly cancelForm = this.fb.nonNullable.group({
    cnlRsn: this.fb.nonNullable.control<string>('3'),
    cancelRem: this.fb.nonNullable.control<string>('', Validators.required),
  });

  readonly einvoiceId = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('id'))),
    { initialValue: null },
  );

  readonly vm = signal<EinvoiceViewModel | null>(null);
  readonly loadState = signal<LoadState>({ kind: 'idle' });
  readonly profileData = signal<Record<string, unknown> | undefined>(
    undefined,
  );
  readonly downloadJsonHref = signal<SafeUrl | null>(null);
  /** Defer QR host until after hydration so `qrcode` does not run on the server. */
  readonly qrHostReady = signal(false);

  readonly itemRows = computed((): Record<string, unknown>[] => {
    const raw = this.vm()?.['ItemList'];
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw as Record<string, unknown>[];
  });

  readonly docDtls = computed(() => asRecord(this.vm()?.['DocDtls']));
  readonly buyerDtls = computed(() => asRecord(this.vm()?.['BuyerDtls']));
  readonly tranDtls = computed(() => asRecord(this.vm()?.['TranDtls']));
  readonly valDtls = computed(() => asRecord(this.vm()?.['ValDtls']));
  readonly shipDtls = computed(() => asRecord(this.vm()?.['ShipDtls']));

  readonly irn = computed(() => str(this.vm()?.response?.['Irn']));
  readonly ackNo = computed(() => str(this.vm()?.response?.['AckNo']));
  readonly ackDt = computed(() => str(this.vm()?.response?.['AckDt']));

  readonly ackDisplay = computed(() => {
    const a = this.ackNo();
    const d = this.ackDt();
    if (a && d) {
      return `${a} · ${d}`;
    }
    return `${a}${d}` || '—';
  });

  readonly shipState = computed(() =>
    stateLabelFromStcd(this.shipDtls()?.['Stcd']),
  );

  readonly hasShipDtls = computed(() => {
    const s = this.shipDtls();
    if (!s) {
      return false;
    }
    return (
      str(s['Gstin']).length > 0 ||
      str(s['LglNm']).length > 0 ||
      str(s['Addr1']).length > 0
    );
  });

  readonly errorText = computed(() => {
    const s = this.loadState();
    return s.kind === 'error' ? s.message : '';
  });

  readonly placeOfSupply = computed(() => {
    const b = asRecord(this.vm()?.['BuyerDtls']);
    return stateLabelFromStcd(b?.['Pos']);
  });

  readonly buyerState = computed(() => {
    const b = asRecord(this.vm()?.['BuyerDtls']);
    return stateLabelFromStcd(b?.['Stcd']);
  });

  readonly signedQrData = computed(() =>
    str(this.vm()?.response?.['SignedQRCode']),
  );

  readonly signedQrImgRelative = computed(() => {
    const r = this.vm()?.response;
    const u = str(r?.['SignedQrCodeImgUrl'] ?? r?.['SignedQRCodeImgUrl']);
    return u.length > 0 ? u : null;
  });

  readonly gstZenImgBase = 'https://my.gstzen.in';

  readonly sellerGstin = computed(() => {
    const sd = asRecord(this.vm()?.['SellerDtls']);
    const g = str(sd?.['Gstin']);
    if (g) {
      return g;
    }
    return pickProfileString(this.profileData(), [
      'GSTIN',
      'tinGstNo',
      'gstin',
      'organizationGstin',
      'Gstin',
    ]).toUpperCase();
  });

  readonly sellerName = computed(() => {
    const sd = asRecord(this.vm()?.['SellerDtls']);
    const g = str(sd?.['LglNm']) || str(sd?.['TrdNm']);
    if (g) {
      return g;
    }
    return pickProfileString(this.profileData(), [
      'organizationName',
      'tradeNam',
      'name',
      'legalName',
      'LglNm',
    ]);
  });

  readonly sellerAddr = computed(() => {
    const sd = asRecord(this.vm()?.['SellerDtls']);
    const g = str(sd?.['Addr1']);
    if (g) {
      return g;
    }
    return pickProfileString(this.profileData(), [
      'organizationAddress',
      'address',
      'Addr1',
    ]);
  });

  readonly sellerCity = computed(() => {
    const sd = asRecord(this.vm()?.['SellerDtls']);
    const g = str(sd?.['Loc']);
    if (g) {
      return g;
    }
    return pickProfileString(this.profileData(), [
      'organizationCity',
      'city',
      'Loc',
    ]);
  });

  readonly sellerState = computed(() => {
    const sd = asRecord(this.vm()?.['SellerDtls']);
    const st = str(sd?.['Stcd']);
    if (st) {
      return stateLabelFromStcd(st);
    }
    return pickProfileString(this.profileData(), ['state', 'organizationState']);
  });

  readonly sellerPin = computed(() => {
    const sd = asRecord(this.vm()?.['SellerDtls']);
    const g = sd?.['Pin'];
    if (g != null && String(g).trim()) {
      return String(g);
    }
    return pickProfileString(this.profileData(), [
      'organizationPincode',
      'pincode',
      'Pin',
      'PIN',
    ]);
  });

  readonly dispatchAddr = computed(() => this.sellerAddr());
  readonly dispatchCity = computed(() => this.sellerCity());
  readonly dispatchState = computed(() => this.sellerState());
  readonly dispatchPin = computed(() => this.sellerPin());

  readonly bank = computed((): Record<string, unknown> | null => {
    const b = this.profileData()?.['bank'];
    if (!Array.isArray(b) || b.length < 1) {
      return null;
    }
    return b[0] as Record<string, unknown>;
  });

  readonly bank2 = computed((): Record<string, unknown> | null => {
    const b = this.profileData()?.['bank'];
    if (!Array.isArray(b) || b.length < 2) {
      return null;
    }
    return b[1] as Record<string, unknown>;
  });

  readonly amountWords = computed(() => {
    const val = asRecord(this.vm()?.['ValDtls']);
    const n = Number(val?.['TotInvVal']);
    if (!Number.isFinite(n)) {
      return '—';
    }
    try {
      return this.toWords.convert(n);
    } catch {
      return '—';
    }
  });

  readonly downloadFileName = computed(() => {
    const d = asRecord(this.vm()?.['DocDtls']);
    const no = str(d?.['No']) || 'einvoice';
    return `${no}.json`;
  });

  readonly t = str;

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    afterNextRender(() => {
      this.qrHostReady.set(true);
    });

    combineLatest([
      this.route.paramMap.pipe(map((p) => p.get('id'))),
      toObservable(this.authStore.user),
    ])
      .pipe(
        switchMap(([id, user]) => {
          if (!id || !user?.id) {
            this.loadState.set({ kind: 'idle' });
            this.vm.set(null);
            this.rawDoc.set(null);
            this.downloadJsonHref.set(null);
            return of(null);
          }
          this.loadState.set({ kind: 'loading' });
          this.rawDoc.set(null);
          return from(this.einvoiceDocs.getEinvoiceById(id)).pipe(
            map((raw) => {
              if (!raw) {
                this.vm.set(null);
                this.rawDoc.set(null);
                this.downloadJsonHref.set(null);
                this.loadState.set({
                  kind: 'error',
                  message: 'E-invoice not found.',
                });
                return null;
              }
              if (String(raw['uid'] ?? '') !== user.id) {
                this.vm.set(null);
                this.rawDoc.set(null);
                this.downloadJsonHref.set(null);
                this.loadState.set({
                  kind: 'error',
                  message: 'You do not have access to this e-invoice.',
                });
                return null;
              }
              const view = mapLegacyDocToEinvoiceView(raw);
              this.vm.set(view);
              this.rawDoc.set(raw);
              this.sheetAction.set('invoice');
              this.cancelForm.reset({ cnlRsn: '3', cancelRem: '' });
              this.cancelUiError.set(null);
              this.patchDownloadHref(view);
              this.loadState.set({ kind: 'ready' });
              return view;
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();

    toObservable(this.authStore.user)
      .pipe(
        switchMap((u) =>
          u?.id
            ? this.userProfile.watchProfileData(u.id).pipe(
                catchError(() => of(undefined)),
              )
            : of(undefined),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((p) => {
        this.profileData.set(
          p && typeof p === 'object'
            ? (p as Record<string, unknown>)
            : undefined,
        );
      });
  }

  private patchDownloadHref(view: EinvoiceViewModel): void {
    try {
      const json = JSON.stringify(view.response);
      const uri = this.sanitizer.bypassSecurityTrustUrl(
        'data:text/json;charset=UTF-8,' + encodeURIComponent(json),
      );
      this.downloadJsonHref.set(uri);
    } catch {
      this.downloadJsonHref.set(null);
    }
  }

  setSheetAction(mode: 'invoice' | 'Cancel'): void {
    this.sheetAction.set(mode);
    this.cancelUiError.set(null);
    if (mode === 'invoice') {
      this.cancelForm.reset({ cnlRsn: '3', cancelRem: '' });
    }
  }

  async confirmCancelInvoice(): Promise<void> {
    if (this.cancelLoading()) {
      return;
    }
    this.cancelUiError.set(null);
    this.cancelForm.markAllAsTouched();
    if (this.cancelForm.invalid) {
      this.cancelUiError.set('Please enter a cancellation reason.');
      return;
    }

    const raw = this.rawDoc();
    const id = this.einvoiceId();
    if (!raw || !id) {
      this.cancelUiError.set('Invoice is not loaded.');
      return;
    }

    const base = asRecord(raw['baseObject']);
    if (!base) {
      this.cancelUiError.set('Invoice payload is missing; cannot cancel.');
      return;
    }

    const { cnlRsn, cancelRem } = this.cancelForm.getRawValue();
    const payload: Record<string, unknown> = {
      ...base,
      CnlRem: cancelRem.trim(),
      CnlRsn: cnlRsn,
    };

    this.cancelLoading.set(true);
    try {
      const res = await firstValueFrom(
        this.einvoiceService.cancelEinvoice(payload),
      );
      await this.einvoiceDocs.finalizeCancellation({
        einvoiceId: id,
        cancelResponse: res,
        cancelReason: cancelRem.trim(),
        fyKey: readFinancialYearKey(),
      });
      await this.router.navigateByUrl('/e-invoices/einvoiceslist');
    } catch (err: unknown) {
      const message =
        err instanceof EinvoiceApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Cancellation failed.';
      this.cancelUiError.set(message);
    } finally {
      this.cancelLoading.set(false);
    }
  }
}

function readFinancialYearKey(): string | null {
  if (typeof globalThis === 'undefined') {
    return null;
  }
  try {
    return (
      globalThis.sessionStorage?.getItem('financialYear') ??
      globalThis.localStorage?.getItem('fy') ??
      null
    );
  } catch {
    return null;
  }
}
