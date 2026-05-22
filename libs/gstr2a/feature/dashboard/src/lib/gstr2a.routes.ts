import { Routes } from '@angular/router';
import { gstr2aAuthGuard } from '@ramsoft-builder/gstr2a/data-access/guards';
import { Gstr2aLegacyRedirectComponent } from '@ramsoft-builder/gstr2a/feature/shared';
import { Gstr2aWorkspaceLayoutComponent } from '@ramsoft-builder/gstr2a/feature/shared';

export const gstr2aRoutes: Routes = [
  {
    path: '',
    component: Gstr2aWorkspaceLayoutComponent,
    canActivate: [gstr2aAuthGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'hub' },
      {
        path: 'hub',
        loadComponent: () =>
          import('./gstr2a-hub.page').then((m) => m.Gstr2aHubPageComponent),
      },
      {
        path: 'b2b',
        loadComponent: () =>
          import('@ramsoft-builder/gstr2a/feature/b2b').then(
            (m) => m.Gstr2aB2bPageComponent,
          ),
      },
      {
        path: 'b2ba',
        component: Gstr2aLegacyRedirectComponent,
        data: { legacyPath: 'gstr2a-b2ba' },
      },
      {
        path: 'cdn',
        component: Gstr2aLegacyRedirectComponent,
        data: { legacyPath: 'gstr2a-cdn' },
      },
      {
        path: 'cdna',
        component: Gstr2aLegacyRedirectComponent,
        data: { legacyPath: 'gstr2a-cdna' },
      },
      {
        path: 'ecom',
        component: Gstr2aLegacyRedirectComponent,
        data: { legacyPath: 'gstr2a-eco' },
      },
      {
        path: 'ecoma',
        component: Gstr2aLegacyRedirectComponent,
        data: { legacyPath: 'gstr2a-ecoa' },
      },
      {
        path: 'isd',
        component: Gstr2aLegacyRedirectComponent,
        data: { legacyPath: 'gstr2a-isd' },
      },
      {
        path: 'isda',
        component: Gstr2aLegacyRedirectComponent,
        data: { legacyPath: 'gstr2a-isda' },
      },
      {
        path: 'impg',
        component: Gstr2aLegacyRedirectComponent,
        data: { legacyPath: 'gstr2a-impg' },
      },
      {
        path: 'impgsez',
        component: Gstr2aLegacyRedirectComponent,
        data: { legacyPath: 'gstr2a-impgsez' },
      },
      {
        path: 'tds',
        component: Gstr2aLegacyRedirectComponent,
        data: { legacyPath: 'gstr2a-tds' },
      },
      {
        path: 'tdsa',
        component: Gstr2aLegacyRedirectComponent,
        data: { legacyPath: 'gstr2a-tdsa' },
      },
      {
        path: 'tcs',
        component: Gstr2aLegacyRedirectComponent,
        data: { legacyPath: 'gstr2a-tcs' },
      },
      {
        path: 'cdn-notes',
        component: Gstr2aLegacyRedirectComponent,
        data: { legacyPath: 'gstr2a-cdn-notes' },
      },
      {
        path: 'cdn-note-detail',
        component: Gstr2aLegacyRedirectComponent,
        data: { legacyPath: 'gstr2a-cdn-note-detail' },
      },
    ],
  },
];
