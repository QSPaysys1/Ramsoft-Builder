import { Routes } from '@angular/router';

export const schoolManagementRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/school-management-layout.component').then(
        (m) => m.SchoolManagementLayoutComponent,
      ),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'hub/home' },
      {
        path: 'hub/:menuId',
        loadComponent: () =>
          import('./pages/school-hub.page').then((m) => m.SchoolHubPageComponent),
      },
      {
        path: 'academics',
        loadChildren: () =>
          import('@ramsoft-builder/school/feature/students').then(
            (m) => m.academicsRoutes,
          ),
      },
    ],
  },
];
