import type { Route } from '@angular/router';

export const returnsDashboardRoute: Route = {
  path: 'returns-dashboard',
  loadComponent: () =>
    import('./pages/returns-dashboard.page').then((m) => m.ReturnsDashboardPageComponent),
};
