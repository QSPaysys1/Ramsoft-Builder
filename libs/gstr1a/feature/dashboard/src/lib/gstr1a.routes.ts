import { Routes } from '@angular/router';
import { gstr1aAuthGuard } from '@ramsoft-builder/gstr1a/data-access/guards';
import { Gstr1aWorkspaceLayoutComponent } from '@ramsoft-builder/gstr1a/feature/shared';

export const gstr1aRoutes: Routes = [
  {
    path: '',
    component: Gstr1aWorkspaceLayoutComponent,
    canActivate: [gstr1aAuthGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'hub' },
      {
        path: 'hub',
        loadComponent: () =>
          import('./gstr1a-hub.page').then((m) => m.Gstr1aHubPageComponent),
      },
      {
        path: 'amendment-summary',
        loadComponent: () =>
          import('@ramsoft-builder/gstr1a/feature/amendment-summary').then(
            (m) => m.Gstr1aAmendmentSummaryPageComponent,
          ),
      },
      {
        path: 'b2b',
        loadComponent: () =>
          import('@ramsoft-builder/gstr1a/feature/b2b').then((m) => m.Gstr1aB2bSectionPageComponent),
      },
      {
        path: 'b2cl',
        loadComponent: () =>
          import('@ramsoft-builder/gstr1a/feature/b2cl').then((m) => m.Gstr1aB2clSectionPageComponent),
      },
      {
        path: 'b2cs',
        loadComponent: () =>
          import('@ramsoft-builder/gstr1a/feature/b2cs').then((m) => m.Gstr1aB2csSectionPageComponent),
      },
      {
        path: 'exp',
        loadComponent: () =>
          import('@ramsoft-builder/gstr1a/feature/exp').then((m) => m.Gstr1aExpSectionPageComponent),
      },
      {
        path: 'nil',
        loadComponent: () =>
          import('@ramsoft-builder/gstr1a/feature/nil').then((m) => m.Gstr1aNilSectionPageComponent),
      },
      {
        path: 'cdnr',
        loadComponent: () =>
          import('@ramsoft-builder/gstr1a/feature/cdnr').then((m) => m.Gstr1aCdnrSectionPageComponent),
      },
      {
        path: 'cdnur',
        loadComponent: () =>
          import('@ramsoft-builder/gstr1a/feature/cdnur').then((m) => m.Gstr1aCdnurSectionPageComponent),
      },
      {
        path: 'at',
        loadComponent: () =>
          import('@ramsoft-builder/gstr1a/feature/at').then((m) => m.Gstr1aAtSectionPageComponent),
      },
      {
        path: 'at/add-statewise',
        loadComponent: () =>
          import('@ramsoft-builder/gstr1a/feature/atadja').then(
            (m) => m.Gstr1aAtAddStatewisePageComponent,
          ),
      },
      {
        path: 'hsn',
        loadComponent: () =>
          import('@ramsoft-builder/gstr1a/feature/hsn').then((m) => m.Gstr1aHsnSectionPageComponent),
      },
      {
        path: 'b2ba',
        loadComponent: () =>
          import('@ramsoft-builder/gstr1a/feature/b2ba').then((m) => m.Gstr1aB2baPageComponent),
      },
      {
        path: 'b2cla',
        loadComponent: () =>
          import('@ramsoft-builder/gstr1a/feature/b2cla').then((m) => m.Gstr1aAmendSectionPageComponent),
      },
      {
        path: 'b2csa',
        loadComponent: () =>
          import('@ramsoft-builder/gstr1a/feature/b2csa').then((m) => m.Gstr1aAmendSectionPageComponent),
      },
      {
        path: 'expa',
        loadComponent: () =>
          import('@ramsoft-builder/gstr1a/feature/expa').then((m) => m.Gstr1aAmendSectionPageComponent),
      },
      {
        path: 'cdnra',
        loadComponent: () =>
          import('@ramsoft-builder/gstr1a/feature/cdnra').then((m) => m.Gstr1aAmendSectionPageComponent),
      },
      {
        path: 'cdnura',
        loadComponent: () =>
          import('@ramsoft-builder/gstr1a/feature/cdnura').then((m) => m.Gstr1aAmendSectionPageComponent),
      },
      {
        path: 'ata',
        loadComponent: () =>
          import('@ramsoft-builder/gstr1a/feature/ata').then((m) => m.Gstr1aAmendSectionPageComponent),
      },
      {
        path: 'txpa',
        loadComponent: () =>
          import('@ramsoft-builder/gstr1a/feature/txpa').then((m) => m.Gstr1aAmendSectionPageComponent),
      },
      {
        path: 'txpda',
        loadComponent: () =>
          import('@ramsoft-builder/gstr1a/feature/txpda').then((m) => m.Gstr1aAmendSectionPageComponent),
      },
      {
        path: 'ecoma',
        loadComponent: () =>
          import('@ramsoft-builder/gstr1a/feature/ecoma').then((m) => m.Gstr1aAmendSectionPageComponent),
      },
      {
        path: 'supecoa',
        loadComponent: () =>
          import('@ramsoft-builder/gstr1a/feature/supecoa').then((m) => m.Gstr1aAmendSectionPageComponent),
      },
      {
        path: 'nil-amendments',
        loadComponent: () =>
          import('@ramsoft-builder/gstr1a/feature/nil-amendments').then(
            (m) => m.Gstr1aAmendSectionPageComponent,
          ),
      },
      {
        path: 'hsn-amendments',
        loadComponent: () =>
          import('@ramsoft-builder/gstr1a/feature/hsn-amendments').then(
            (m) => m.Gstr1aAmendSectionPageComponent,
          ),
      },
      {
        path: 'docs-amendments',
        loadComponent: () =>
          import('@ramsoft-builder/gstr1a/feature/docs-amendments').then(
            (m) => m.Gstr1aAmendSectionPageComponent,
          ),
      },
      {
        path: 'filing',
        loadComponent: () =>
          import('@ramsoft-builder/gstr1a/feature/filing').then(
            (m) => m.Gstr1aFilingPageComponent,
          ),
      },
    ],
  },
];
