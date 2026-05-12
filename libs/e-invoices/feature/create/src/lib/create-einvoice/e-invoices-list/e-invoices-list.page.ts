import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { AuthStore } from '@ramsoft-builder/auth/data-access/auth';
import {
  EinvoiceDocRepository,
  UserDashboardRepository,
} from '@ramsoft-builder/e-invoices/data-access/einvoice';
import { catchError, of, switchMap } from 'rxjs';
import { RouterLink } from '@angular/router';
import {
  type EinvoiceListRow,
  mapEinvoiceDocToListRow,
} from './map-einvoice-doc-to-list-row';

@Component({
  standalone: true,
  selector: 'lib-e-invoices-list-page',
  imports: [FormsModule, RouterLink],
  templateUrl: './e-invoices-list.page.html',
  styleUrl: './e-invoices-list.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EInvoicesListPageComponent {
  private readonly einvoiceDocs = inject(EinvoiceDocRepository);
  private readonly userDashboard = inject(UserDashboardRepository);
  private readonly authStore = inject(AuthStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly platformId = inject(PLATFORM_ID);

  readonly selectedRow = signal<EinvoiceListRow | null>(null);
  readonly filterOpen = signal(false);
  readonly isFilterClosing = signal(false);

  readonly searchText = signal('');
  readonly deleteLoading = signal(false);

  private readonly rawDocs = signal<
    (Record<string, unknown> & { id: string })[]
  >([]);

  readonly einvoicesNormalized = computed(() =>
    this.rawDocs().map((d) => mapEinvoiceDocToListRow(d)),
  );

  readonly searchFiltered = computed(() => {
    const q = this.searchText().trim().toLowerCase();
    const rows = this.einvoicesNormalized();
    if (q.length < 2) {
      return rows;
    }
    return rows.filter(
      (r) =>
        r.docNo.toLowerCase().includes(q) ||
        r.buyerName.toLowerCase().includes(q) ||
        r.buyerGstin.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q),
    );
  });

  readonly selectedIRNStatus = signal(new Set<string>());
  readonly selectedCustomerGSTIN = signal(new Set<string>());
  readonly selectedCustomer = signal(new Set<string>());
  readonly selectedCustomerLocation = signal(new Set<string>());

  readonly irnStatusSearch = signal('');
  readonly customerGSTINSearch = signal('');
  readonly customerSearch = signal('');
  readonly customerLocationSearch = signal('');

  readonly irnStatusMore = signal(false);
  readonly customerGSTINMore = signal(false);
  readonly customerMore = signal(false);
  readonly customerLocationMore = signal(false);

  readonly filteredEinvoices = computed(() => {
    const all = this.searchFiltered();
    const irn = this.selectedIRNStatus();
    const gst = this.selectedCustomerGSTIN();
    const cust = this.selectedCustomer();
    const loc = this.selectedCustomerLocation();

    return all.filter((einvoice) => {
      const statusKey = einvoice.irnStatus ?? 'NON';
      const irnStatusMatch = irn.size === 0 || irn.has(statusKey);
      const gstinKey = einvoice.buyerGstin || 'N/A';
      const customerGSTINMatch = gst.size === 0 || gst.has(gstinKey);
      const nameKey = einvoice.buyerName || 'N/A';
      const customerMatch = cust.size === 0 || cust.has(nameKey);
      const locKey = einvoice.buyerLoc || 'N/A';
      const customerLocationMatch = loc.size === 0 || loc.has(locKey);
      return (
        irnStatusMatch &&
        customerGSTINMatch &&
        customerMatch &&
        customerLocationMatch
      );
    });
  });

  readonly irnStatusOptions = computed(() => {
    const counts = new Map<string, number>();
    for (const n of this.einvoicesNormalized()) {
      const k = n.irnStatus ?? 'NON';
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return [...counts.entries()].map(([status, count]) => ({ status, count }));
  });

  readonly filteredIRNStatusOptions = computed(() => {
    const search = this.irnStatusSearch().toLowerCase();
    return this.irnStatusOptions().filter((x) =>
      (x.status ?? '').toLowerCase().includes(search),
    );
  });

  readonly customerGSTINOptions = computed(() => {
    const counts = new Map<string, number>();
    for (const n of this.einvoicesNormalized()) {
      const k = n.buyerGstin || 'N/A';
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return [...counts.entries()].map(([customerGSTIN, count]) => ({
      customerGSTIN,
      count,
    }));
  });

  readonly filteredCustomerGSTINOptions = computed(() => {
    const search = this.customerGSTINSearch().toLowerCase();
    return this.customerGSTINOptions().filter((x) =>
      x.customerGSTIN.toLowerCase().includes(search),
    );
  });

  readonly customerOptions = computed(() => {
    const counts = new Map<string, number>();
    for (const n of this.einvoicesNormalized()) {
      const k = n.buyerName || 'N/A';
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return [...counts.entries()].map(([customer, count]) => ({
      customer,
      count,
    }));
  });

  /** Uses `customerSearch` (fixes legacy bug that used `customerLocationSearch`). */
  readonly filteredCustomerOptions = computed(() => {
    const search = this.customerSearch().toLowerCase();
    return this.customerOptions().filter((x) =>
      x.customer.toLowerCase().includes(search),
    );
  });

  readonly customerLocationOptions = computed(() => {
    const counts = new Map<string, number>();
    for (const n of this.einvoicesNormalized()) {
      const k = n.buyerLoc || 'N/A';
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return [...counts.entries()].map(([customerLocation, count]) => ({
      customerLocation,
      count,
    }));
  });

  readonly filteredCustomerLocationOptions = computed(() => {
    const search = this.customerLocationSearch().toLowerCase();
    return this.customerLocationOptions().filter((x) =>
      x.customerLocation.toLowerCase().includes(search),
    );
  });

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    toObservable(this.authStore.user)
      .pipe(
        switchMap((user) => {
          if (!user?.id) {
            return of<(Record<string, unknown> & { id: string })[]>([]);
          }
          return this.einvoiceDocs.watchEinvoicesForUser(user.id).pipe(
            catchError(() => of([])),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((list) => {
        this.rawDocs.set(list);
        this.cdr.markForCheck();
      });
  }

  openFilter(): void {
    this.selectedRow.set(null);
    if (this.filterOpen()) {
      this.isFilterClosing.set(true);
      globalThis.setTimeout(() => {
        this.filterOpen.set(false);
        this.isFilterClosing.set(false);
        this.cdr.markForCheck();
      }, 300);
    } else {
      this.filterOpen.set(true);
    }
    this.cdr.markForCheck();
  }

  selectRow(row: EinvoiceListRow): void {
    this.selectedRow.set(row);
    this.cdr.markForCheck();
  }

  clearIRNStatusFilter(): void {
    this.selectedIRNStatus.set(new Set());
  }

  clearCustomerGSTINFilter(): void {
    this.selectedCustomerGSTIN.set(new Set());
  }

  clearCustomerFilter(): void {
    this.selectedCustomer.set(new Set());
  }

  clearCustomerLocationFilter(): void {
    this.selectedCustomerLocation.set(new Set());
  }

  toggleIRNStatusFilter(irnStatus: string): void {
    const set = new Set(this.selectedIRNStatus());
    if (set.has(irnStatus)) {
      set.delete(irnStatus);
    } else {
      set.add(irnStatus);
    }
    this.selectedIRNStatus.set(set);
  }

  toggleCustomerGSTINFilter(customerGSTIN: string): void {
    const set = new Set(this.selectedCustomerGSTIN());
    if (set.has(customerGSTIN)) {
      set.delete(customerGSTIN);
    } else {
      set.add(customerGSTIN);
    }
    this.selectedCustomerGSTIN.set(set);
  }

  toggleCustomerFilter(customer: string): void {
    const set = new Set(this.selectedCustomer());
    if (set.has(customer)) {
      set.delete(customer);
    } else {
      set.add(customer);
    }
    this.selectedCustomer.set(set);
  }

  toggleCustomerLocationFilter(customerLocation: string): void {
    const set = new Set(this.selectedCustomerLocation());
    if (set.has(customerLocation)) {
      set.delete(customerLocation);
    } else {
      set.add(customerLocation);
    }
    this.selectedCustomerLocation.set(set);
  }

  async deleteIt(id: string): Promise<void> {
    if (this.deleteLoading()) {
      return;
    }
    const uid = this.authStore.user()?.id;
    if (!uid) {
      return;
    }
    this.deleteLoading.set(true);
    try {
      await this.einvoiceDocs.deleteEinvoice(id);
      const fy = readFinancialYearKey();
      if (fy) {
        await this.userDashboard.decrementInvoiceCount(uid, fy);
      }
      this.rawDocs.update((list) => list.filter((d) => d.id !== id));
      this.selectedRow.set(null);
    } finally {
      this.deleteLoading.set(false);
      this.cdr.markForCheck();
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
