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
  { path: 'get', loadComponent: () => import('./pages/get-ewaybill.page').then((m) => m.GetEwaybillPageComponent) },
  {
    path: 'transporter-view',
    loadComponent: () =>
      import('./pages/transporter-view.page').then((m) => m.TransporterViewPageComponent),
  },
  {
    path: 'transporter-state-view',
    loadComponent: () =>
      import('./pages/transporter-state-view.page').then(
        (m) => m.TransporterStateViewPageComponent,
      ),
  },
  {
    path: 'transporter-gstin-view',
    loadComponent: () =>
      import('./pages/transporter-gstin-view.page').then(
        (m) => m.TransporterGstinViewPageComponent,
      ),
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
    path: 'multi-vehicle',
    loadComponent: () =>
      import('./pages/initiate-multi-vehicle-movement.page').then(
        (m) => m.InitiateMultiVehicleMovementPageComponent,
      ),
  },
  {
    path: 'add-multi-vehicles',
    loadComponent: () =>
      import('./pages/add-multi-vehicles.page').then((m) => m.EwbMvGroupPostPageComponent),
  },
  {
    path: 'change-multi-vehicles',
    loadComponent: () =>
      import('./pages/change-multi-vehicles.page').then(
        (m) => m.ChangeMultiVehiclesPageComponent,
      ),
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
