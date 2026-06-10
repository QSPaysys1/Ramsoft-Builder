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
        path: 'upload',
        loadComponent: () =>
          import('./upload/upload.page').then((m) => m.UploadPageComponent),
      },
      {
        path: 'school-management',
        loadChildren: () =>
          import('./school-management/school-management.routes').then(
            (m) => m.schoolManagementRoutes,
          ),
      },
      {
        path: 'notes-ai',
        loadChildren: () =>
          import('@ramsoft-builder/llm/feature/tools').then(
            (m) => m.notesAiRoutes,
          ),
      },
      {
        path: 'audio-to-text',
        loadChildren: () =>
          import('@ramsoft-builder/llm/feature/tools').then(
            (m) => m.audioToTextRoutes,
          ),
      },
      {
        path: 'video-to-text',
        loadChildren: () =>
          import('@ramsoft-builder/llm/feature/tools').then(
            (m) => m.videoToTextRoutes,
          ),
      },
      {
        path: 'summarizer',
        loadChildren: () =>
          import('@ramsoft-builder/llm/feature/tools').then(
            (m) => m.summarizerRoutes,
          ),
      },
      {
        path: 'translate',
        loadChildren: () =>
          import('@ramsoft-builder/llm/feature/tools').then(
            (m) => m.translateRoutes,
          ),
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
        path: 'gstr1a',
        loadChildren: () =>
          import('@ramsoft-builder/gstr1a/feature/dashboard').then((m) => m.gstr1aRoutes),
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
