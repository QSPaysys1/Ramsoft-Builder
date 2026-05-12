import { Route } from '@angular/router';
import { loginRedirectGuard } from '@ramsoft-builder/auth/data-access/auth';
import { LoginPageComponent } from './login-page.component';

export const loginRoutes: Route[] = [
  {
    path: '',
    component: LoginPageComponent,
    canActivate: [loginRedirectGuard],
  },
];
