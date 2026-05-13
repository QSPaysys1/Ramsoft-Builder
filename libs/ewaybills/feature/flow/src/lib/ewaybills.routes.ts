import type { Routes } from '@angular/router';

export const ewaybillsRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'list' },
  {
    path: 'list',
    loadComponent: () =>
      import('./pages/ewaybills-list.page').then((m) => m.EwaybillsListPageComponent),
  },
  {
    path: 'create',
    loadComponent: () =>
      import('./pages/create-ewaybill.page').then((m) => m.CreateEwaybillPageComponent),
  },
  {
    path: 'get',
    loadComponent: () =>
      import('./pages/get-ewaybill.page').then((m) => m.GetEwaybillPageComponent),
  },
  {
    path: 'update-part-b',
    loadComponent: () =>
      import('./pages/update-part-b.page').then((m) => m.UpdatePartBPageComponent),
  },
  {
    path: 'extend',
    loadComponent: () =>
      import('./pages/extend-ewaybill.page').then((m) => m.ExtendEwaybillPageComponent),
  },
  {
    path: 'update-transporter',
    loadComponent: () =>
      import('./pages/update-transporter.page').then((m) => m.UpdateTransporterPageComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/ewaybill-detail.page').then((m) => m.EwaybillDetailPageComponent),
  },
];
