import { Routes } from '@angular/router';
import {
  gstr1AuthGuard,
  gstr1LoginRedirectGuard,
} from '@ramsoft-builder/gstr1/data-access/gstzen-auth';

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
      import('./pages/gstr1-workspace.page').then(
        (m) => m.Gstr1WorkspacePageComponent,
      ),
    canActivate: [gstr1AuthGuard],
  },
  {
    path: 'gstn/generate-otp',
    loadComponent: () =>
      import('./pages/gstr1-gstn-generate-otp.page').then(
        (m) => m.Gstr1GstnGenerateOtpPageComponent,
      ),
    canActivate: [gstr1AuthGuard],
  },
  { path: '', pathMatch: 'full', redirectTo: 'workspace' },
];
