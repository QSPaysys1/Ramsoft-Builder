import { Routes } from '@angular/router';
import { PROMOTIONS_SHELL_CONFIG } from './school-admin-shell.config';

export const promotionsRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./school-admin-shell.component').then(
        (m) => m.SchoolAdminShellComponent,
      ),
    data: { shell: PROMOTIONS_SHELL_CONFIG },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'class-promotions' },
      {
        path: 'class-promotions',
        loadComponent: () =>
          import('./school-admin-placeholder.page').then(
            (m) => m.SchoolAdminPlaceholderPageComponent,
          ),
        data: { title: 'Class Promotions' },
      },
      {
        path: 'section-changes',
        loadComponent: () =>
          import('./school-admin-placeholder.page').then(
            (m) => m.SchoolAdminPlaceholderPageComponent,
          ),
        data: { title: 'Section Changes' },
      },
      {
        path: 'academic-year',
        loadComponent: () =>
          import('./school-admin-placeholder.page').then(
            (m) => m.SchoolAdminPlaceholderPageComponent,
          ),
        data: { title: 'Academic Year Promotion' },
      },
      {
        path: 'bulk',
        loadComponent: () =>
          import('./students-promotions.page').then(
            (m) => m.StudentsPromotionsPageComponent,
          ),
      },
      {
        path: 'history',
        loadComponent: () =>
          import('./school-admin-placeholder.page').then(
            (m) => m.SchoolAdminPlaceholderPageComponent,
          ),
        data: { title: 'Promotion History' },
      },
    ],
  },
];
