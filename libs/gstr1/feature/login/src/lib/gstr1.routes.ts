import { Routes } from '@angular/router';
import {
  gstr1AuthGuard,
  gstr1LoginRedirectGuard,
} from '@ramsoft-builder/gstr1/data-access/gstzen-auth';
import { returnsDashboardRoute } from './returns-dashboard.routes';

export const gstr1Routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/gstr1-login.page').then((m) => m.Gstr1LoginPageComponent),
    canActivate: [gstr1LoginRedirectGuard],
  },
  {
    path: 'workspace',
    loadComponent: () =>
      import('./pages/gstr1-workspace-layout.page').then(
        (m) => m.Gstr1WorkspaceLayoutPageComponent,
      ),
    canActivate: [gstr1AuthGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'returns-dashboard' },
      returnsDashboardRoute,
      {
        path: 'gstr1-download',
        loadComponent: () =>
          import('./pages/gstr1-download-return.page').then(
            (m) => m.Gstr1DownloadReturnPageComponent,
          ),
      },
      {
        path: 'session',
        loadComponent: () =>
          import('./pages/gstr1-workspace-session.page').then(
            (m) => m.Gstr1WorkspaceSessionPageComponent,
          ),
      },
    ],
  },
  {
    path: 'gstn/generate-otp',
    loadComponent: () =>
      import('./pages/gstr1-gstn-generate-otp.page').then(
        (m) => m.Gstr1GstnGenerateOtpPageComponent,
      ),
    canActivate: [gstr1AuthGuard],
  },
  {
    path: 'gstn/return-status',
    loadComponent: () =>
      import('./pages/gstr1-gstn-return-status.page').then(
        (m) => m.Gstr1GstnReturnStatusPageComponent,
      ),
    canActivate: [gstr1AuthGuard],
  },
  {
    path: 'gstn/view-track-returns',
    loadComponent: () =>
      import('./pages/gstr1-gstn-view-track-returns.page').then(
        (m) => m.Gstr1GstnViewTrackReturnsPageComponent,
      ),
    canActivate: [gstr1AuthGuard],
  },
  { path: '', pathMatch: 'full', redirectTo: 'workspace' },
];
