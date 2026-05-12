import { Routes } from '@angular/router';

export const eInvoicesRoutes: Routes = [
  {
    path: 'create',
    loadComponent: () =>
      import('./create-einvoice/create-einvoice.page').then(
        (m) => m.CreateEinvoicePageComponent,
      ),
  },
  {
    path: 'einvoiceslist',
    loadComponent: () =>
      import('./create-einvoice/e-invoices-list/e-invoices-list.page').then(
        (m) => m.EInvoicesListPageComponent,
      ),
  },
  {
    path: 'einvoice/:id',
    loadComponent: () =>
      import('./create-einvoice/einvoice-view/einvoice-view.page').then(
        (m) => m.EinvoiceViewPageComponent,
      ),
  },
  /** Legacy usaccounting paths used by the home dashboard tiles. */
  {
    path: 'cancelledeinvoices',
    pathMatch: 'full',
    redirectTo: 'create',
  },
  { path: 'ewaybills', pathMatch: 'full', redirectTo: 'create' },
  { path: 'creditnotes', pathMatch: 'full', redirectTo: 'create' },
  { path: 'debitnotes', pathMatch: 'full', redirectTo: 'create' },
  { path: 'gsttrack', pathMatch: 'full', redirectTo: 'create' },
  { path: '', pathMatch: 'full', redirectTo: 'einvoiceslist' },
];
