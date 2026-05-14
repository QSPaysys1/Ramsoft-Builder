import { Provider } from '@angular/core';
import {
  GSTR1_GSTZEN_AUTH_CONFIG,
  type Gstr1GstzenAuthEnvironment,
} from './gstr1-gstzen-auth.config';

export function provideGstr1GstzenAuthConfig(
  env: Gstr1GstzenAuthEnvironment,
): Provider {
  return { provide: GSTR1_GSTZEN_AUTH_CONFIG, useValue: env };
}
