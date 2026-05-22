import { Routes } from '@angular/router';
import { gstr3bAuthGuard } from '@ramsoft-builder/gstr3b/data-access/guards';
import { Gstr3bWorkspaceLayoutComponent } from '@ramsoft-builder/gstr3b/feature/shared';

export const gstr3bRoutes: Routes = [
  {
    path: '',
    component: Gstr3bWorkspaceLayoutComponent,
    canActivate: [gstr3bAuthGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'summary' },
      {
        path: 'hub',
        loadComponent: () =>
          import('./gstr3b-hub.page').then((m) => m.Gstr3bHubPageComponent),
      },
      {
        path: 'summary',
        loadComponent: () =>
          import('@ramsoft-builder/gstr3b/feature/summary').then(
            (m) => m.Gstr3bSummaryPageComponent,
          ),
      },
      {
        path: 'outward-supplies',
        loadComponent: () =>
          import('@ramsoft-builder/gstr3b/feature/outward-supplies').then(
            (m) => m.Gstr3bSupDetailsPageComponent,
          ),
      },
      {
        path: 'outward-supplies/eco',
        loadComponent: () =>
          import('@ramsoft-builder/gstr3b/feature/outward-supplies').then(
            (m) => m.Gstr3bEcoDetailsPageComponent,
          ),
      },
      {
        path: 'outward-supplies/inter',
        loadComponent: () =>
          import('@ramsoft-builder/gstr3b/feature/outward-supplies').then(
            (m) => m.Gstr3bInterSupDetailsPageComponent,
          ),
      },
      {
        path: 'inward-supplies',
        loadComponent: () =>
          import('@ramsoft-builder/gstr3b/feature/inward-supplies').then(
            (m) => m.Gstr3bInwardSupDetailsPageComponent,
          ),
      },
      {
        path: 'itc',
        loadComponent: () =>
          import('@ramsoft-builder/gstr3b/feature/itc').then(
            (m) => m.Gstr3bItcDetailsPageComponent,
          ),
      },
      {
        path: 'interest-late-fee',
        loadComponent: () =>
          import('@ramsoft-builder/gstr3b/feature/interest-late-fee').then(
            (m) => m.Gstr3bIntrLtfeeDetailsPageComponent,
          ),
      },
      {
        path: 'payment-tax',
        loadComponent: () =>
          import('@ramsoft-builder/gstr3b/feature/payment-tax').then(
            (m) => m.Gstr3bPaymentDetailsPageComponent,
          ),
      },
      {
        path: 'exempt-nil-non-gst',
        loadComponent: () =>
          import('@ramsoft-builder/gstr3b/feature/exempt-nil-non-gst').then(
            (m) => m.Gstr3bExemptNilPageComponent,
          ),
      },
      {
        path: 'filing',
        loadComponent: () =>
          import('@ramsoft-builder/gstr3b/feature/filing').then(
            (m) => m.Gstr3bFilingPageComponent,
          ),
      },
    ],
  },
];
