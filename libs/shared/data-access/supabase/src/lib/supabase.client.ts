import { isPlatformBrowser } from '@angular/common';
import {
  InjectionToken,
  PLATFORM_ID,
  inject,
  type Provider,
} from '@angular/core';
import {
  createClient,
  type LockFunc,
  type SupabaseClient,
} from '@supabase/supabase-js';

/**
 * Skip Web Locks for cross-tab auth coordination. The default `navigator.locks`
 * path often throws `NavigatorLockAcquireTimeoutError` under Angular + Zone.js
 * (and with concurrent HMR/dev clients), which can break token persistence.
 *
 * Trade-off: less cross-tab refresh serialization; acceptable for this SPA.
 */
const browserAuthLockNoOp: LockFunc = (_name, _acquireTimeout, fn) => fn();

export const SUPABASE_CLIENT = new InjectionToken<SupabaseClient | null>(
  'SUPABASE_CLIENT',
);

export interface SupabasePublicConfig {
  url: string;
  anonKey: string;
}

/**
 * Browser-only Supabase client (null on server / SSR). Session persistence uses
 * the default `localStorage` strategy from `@supabase/supabase-js`.
 */
export function provideSupabaseClient(
  config: SupabasePublicConfig,
): Provider[] {
  return [
    {
      provide: SUPABASE_CLIENT,
      useFactory: (platformId: object) => {
        if (!isPlatformBrowser(platformId)) {
          return null;
        }
        const url = config.url?.trim();
        const anonKey = config.anonKey?.trim();
        if (!url || !anonKey) {
          console.warn(
            '[supabase] SUPABASE_CLIENT not created: empty url or anonKey in environment.',
          );
          return null;
        }
        if (
          url.includes('YOUR_PROJECT_REF') ||
          anonKey.includes('YOUR_SUPABASE_ANON_KEY')
        ) {
          console.warn(
            '[supabase] environment still uses placeholder url/anonKey — requests will fail. Set real values from Supabase → Project Settings → API.',
            { urlHost: (() => {
              try {
                return new URL(url).host;
              } catch {
                return url;
              }
            })() },
          );
        }
        return createClient(url, anonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            lock: browserAuthLockNoOp,
            lockAcquireTimeout: 10000,
          },
        });
      },
      deps: [PLATFORM_ID],
    },
  ];
}

/** Returns the injected client or null (server / misconfigured). */
export function injectSupabaseClient(): SupabaseClient | null {
  return inject(SUPABASE_CLIENT, { optional: true }) ?? null;
}
