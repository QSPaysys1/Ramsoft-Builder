import { Routes } from '@angular/router';
import type { StudentStatus } from '@ramsoft-builder/school/models/students';
import { STUDENTS_SHELL_CONFIG } from './school-admin-shell.config';

export interface StudentsListRouteData {
  title: string;
  statusFilter?: StudentStatus | StudentStatus[];
  profileLink?: boolean;
}

export interface TransfersPageRouteData {
  title: string;
  defaultTransferType: string;
  lockTransferType?: boolean;
}

export const studentsRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./school-admin-shell.component').then(
        (m) => m.SchoolAdminShellComponent,
      ),
    data: { shell: STUDENTS_SHELL_CONFIG },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'all' },
      {
        path: 'all',
        loadComponent: () =>
          import('./students-list.page').then((m) => m.StudentsListPageComponent),
        data: { title: 'All Students' } satisfies StudentsListRouteData,
      },
      {
        path: 'active',
        loadComponent: () =>
          import('./students-list.page').then((m) => m.StudentsListPageComponent),
        data: {
          title: 'Active Students',
          statusFilter: 'active',
        } satisfies StudentsListRouteData,
      },
      {
        path: 'inactive',
        loadComponent: () =>
          import('./students-list.page').then((m) => m.StudentsListPageComponent),
        data: {
          title: 'Inactive Students',
          statusFilter: ['inactive', 'dropped'],
        } satisfies StudentsListRouteData,
      },
      {
        path: 'profiles',
        loadComponent: () =>
          import('./students-list.page').then((m) => m.StudentsListPageComponent),
        data: {
          title: 'Student Profiles',
          profileLink: true,
        } satisfies StudentsListRouteData,
      },
      {
        path: 'alumni',
        loadComponent: () =>
          import('./students-list.page').then((m) => m.StudentsListPageComponent),
        data: {
          title: 'Alumni',
          statusFilter: 'alumni',
        } satisfies StudentsListRouteData,
      },
      {
        path: 'admission/new',
        loadComponent: () =>
          import('./students-admission.page').then((m) => m.StudentsAdmissionPageComponent),
      },
      {
        path: 'profile/:id',
        loadComponent: () =>
          import('./students-profile.page').then((m) => m.StudentsProfilePageComponent),
      },
    ],
  },
];
