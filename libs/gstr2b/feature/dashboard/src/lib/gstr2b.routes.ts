import { Routes } from '@angular/router';
import { gstr2bAuthGuard } from '@ramsoft-builder/gstr2b/data-access/guards';
import {
  Gstr2bLegacyRedirectComponent,
  Gstr2bWorkspaceLayoutComponent,
} from '@ramsoft-builder/gstr2b/feature/shared';

export const gstr2bRoutes: Routes = [
  {
    path: '',
    component: Gstr2bWorkspaceLayoutComponent,
    canActivate: [gstr2bAuthGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'hub' },
      {
        path: 'hub',
        loadComponent: () =>
          import('./gstr2b-hub.page').then((m) => m.Gstr2bHubPageComponent),
      },
      {
        path: 'summary',
        loadComponent: () =>
          import('@ramsoft-builder/gstr2b/feature/summary').then(
            (m) => m.Gstr2bSummaryPageComponent,
          ),
      },
      {
        path: 'b2b',
        loadComponent: () =>
          import('@ramsoft-builder/gstr2b/feature/b2b').then(
            (m) => m.Gstr2bB2bPageComponent,
          ),
      },
      {
        path: 'itc-summary',
        component: Gstr2bLegacyRedirectComponent,
        data: { gstr2bTarget: 'summary' },
      },
      {
        path: 'reconciliation',
        loadComponent: () =>
          import('@ramsoft-builder/gstr2b/feature/reconciliation').then(
            (m) => m.Gstr2bReconciliationPageComponent,
          ),
      },
      {
        path: 'b2ba',
        component: Gstr2bLegacyRedirectComponent,
        data: { gstr2bTarget: 'summary' },
      },
      {
        path: 'cdn',
        component: Gstr2bLegacyRedirectComponent,
        data: { gstr2bTarget: 'summary' },
      },
      {
        path: 'cdna',
        component: Gstr2bLegacyRedirectComponent,
        data: { gstr2bTarget: 'summary' },
      },
      {
        path: 'isd',
        component: Gstr2bLegacyRedirectComponent,
        data: { gstr2bTarget: 'summary' },
      },
      {
        path: 'isda',
        component: Gstr2bLegacyRedirectComponent,
        data: { gstr2bTarget: 'summary' },
      },
      {
        path: 'impg',
        component: Gstr2bLegacyRedirectComponent,
        data: { gstr2bTarget: 'summary' },
      },
      {
        path: 'impgsez',
        component: Gstr2bLegacyRedirectComponent,
        data: { gstr2bTarget: 'summary' },
      },
      {
        path: 'ecom',
        component: Gstr2bLegacyRedirectComponent,
        data: { gstr2bTarget: 'summary' },
      },
      {
        path: 'ecoma',
        component: Gstr2bLegacyRedirectComponent,
        data: { gstr2bTarget: 'summary' },
      },
    ],
  },
];
