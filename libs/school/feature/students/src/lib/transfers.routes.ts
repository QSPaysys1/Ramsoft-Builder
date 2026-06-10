import { Routes } from '@angular/router';
import { TRANSFERS_SHELL_CONFIG } from './school-admin-shell.config';
import type { StudentsListRouteData, TransfersPageRouteData } from './students.routes';

export const transfersRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./school-admin-shell.component').then(
        (m) => m.SchoolAdminShellComponent,
      ),
    data: { shell: TRANSFERS_SHELL_CONFIG },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'requests' },
      {
        path: 'requests',
        loadComponent: () =>
          import('./school-admin-placeholder.page').then(
            (m) => m.SchoolAdminPlaceholderPageComponent,
          ),
        data: { title: 'Transfer Requests' },
      },
      {
        path: 'issue-tc',
        loadComponent: () =>
          import('./students-transfers.page').then(
            (m) => m.StudentsTransfersPageComponent,
          ),
        data: {
          title: 'Issue Transfer Certificate (TC)',
          defaultTransferType: 'outgoing',
          lockTransferType: true,
        } satisfies TransfersPageRouteData,
      },
      {
        path: 'internal',
        loadComponent: () =>
          import('./students-transfers.page').then(
            (m) => m.StudentsTransfersPageComponent,
          ),
        data: {
          title: 'Internal Transfers',
          defaultTransferType: 'internal',
          lockTransferType: true,
        } satisfies TransfersPageRouteData,
      },
      {
        path: 'outgoing',
        loadComponent: () =>
          import('./students-transfers.page').then(
            (m) => m.StudentsTransfersPageComponent,
          ),
        data: {
          title: 'Outgoing Transfers',
          defaultTransferType: 'outgoing',
          lockTransferType: true,
        } satisfies TransfersPageRouteData,
      },
      {
        path: 'history',
        loadComponent: () =>
          import('./students-list.page').then((m) => m.StudentsListPageComponent),
        data: {
          title: 'Transfer History',
          statusFilter: 'transferred',
          profileLink: true,
        } satisfies StudentsListRouteData,
      },
    ],
  },
];
