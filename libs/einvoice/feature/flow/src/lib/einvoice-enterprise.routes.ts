import type { Routes } from '@angular/router';
import { EinvoiceShellComponent } from './einvoice-shell.component';

export const einvoiceEnterpriseRoutes: Routes = [
  {
    path: '',
    component: EinvoiceShellComponent,
    children: [
      {
        path: 'create',
        loadComponent: () =>
          import('./einvoice-create-enterprise.page').then(
            (m) => m.EinvoiceCreateEnterprisePageComponent,
          ),
        data: { einvoiceMode: 'irn' },
      },
      {
        path: 'create-ewaybill',
        loadComponent: () =>
          import('./einvoice-create-enterprise.page').then(
            (m) => m.EinvoiceCreateEnterprisePageComponent,
          ),
        data: { einvoiceMode: 'irn-ewb' },
      },
      {
        path: 'success',
        loadComponent: () =>
          import('./einvoice-success-enterprise.page').then(
            (m) => m.EinvoiceSuccessEnterprisePageComponent,
          ),
      },
      {
        path: 'error',
        loadComponent: () =>
          import('./einvoice-error-enterprise.page').then(
            (m) => m.EinvoiceErrorEnterprisePageComponent,
          ),
      },
      {
        path: 'get-by-irn',
        loadComponent: () =>
          import('./einvoice-get-by-irn.page').then(
            (m) => m.EinvoiceGetByIrnPageComponent,
          ),
      },
      { path: '', pathMatch: 'full', redirectTo: 'create' },
    ],
  },
];
