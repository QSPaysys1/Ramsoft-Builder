import { Routes } from '@angular/router';
import { authGuard } from '@ramsoft-builder/auth/data-access/auth';

export const appRoutes: Routes = [
  {
    path: 'login',
    loadChildren: () =>
      import('@ramsoft-builder/auth/feature/login').then((m) => m.loginRoutes),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/app-shell.component').then((m) => m.AppShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      {
        path: 'home',
        loadComponent: () =>
          import('./home/home.page').then((m) => m.HomePageComponent),
      },
      {
        path: 'e-invoice',
        loadChildren: () =>
          import('@ramsoft-builder/einvoice/feature/flow').then(
            (m) => m.einvoiceEnterpriseRoutes,
          ),
      },
      {
        path: 'e-invoices',
        loadChildren: () =>
          import('@ramsoft-builder/e-invoices/feature/create').then(
            (m) => m.eInvoicesRoutes,
          ),
      },
      {
        path: 'gstr1',
        loadChildren: () =>
          import('@ramsoft-builder/gstr1/feature/login').then((m) => m.gstr1Routes),
      },
      {
        path: 'gstr2a',
        loadChildren: () =>
          import('@ramsoft-builder/gstr2a/feature/dashboard').then((m) => m.gstr2aRoutes),
      },
      {
        path: 'gstr2b',
        loadChildren: () =>
          import('@ramsoft-builder/gstr2b/feature/dashboard').then((m) => m.gstr2bRoutes),
      },
      {
        path: 'gstr3b',
        loadChildren: () =>
          import('@ramsoft-builder/gstr3b/feature/dashboard').then((m) => m.gstr3bRoutes),
      },
      {
        path: 'versions/issues',
        loadComponent: () =>
          import('./versions/versions-issues-page.component').then(
            (m) => m.VersionsIssuesPageComponent,
          ),
      },
      {
        path: 'versions/myissues',
        loadComponent: () =>
          import('./versions/my-issues-page.component').then(
            (m) => m.MyIssuesPageComponent,
          ),
      },
      {
        path: 'versions',
        pathMatch: 'full',
        loadComponent: () =>
          import('./versions/versions-page.component').then(
            (m) => m.VersionsPageComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: 'home' },
];
