import { Routes } from '@angular/router';
import { promotionsRoutes } from './promotions.routes';
import { studentsRoutes } from './students.routes';
import { transfersRoutes } from './transfers.routes';

export const academicsRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./academics-shell.component').then((m) => m.AcademicsShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'students/all' },
      { path: 'students', children: studentsRoutes },
      { path: 'transfers', children: transfersRoutes },
      { path: 'promotions', children: promotionsRoutes },
    ],
  },
];
