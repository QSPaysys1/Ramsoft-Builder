# GSTR-1 · GSTZen integration

This domain packages the **GSTZen JWT authentication** flow and lays out libraries for future **GSTR-1 HTTP APIs** in alignment with the monorepo (`libs/{domain}/{type}/{name}`).

## Folder structure

| Path | Role |
| ---- | ---- |
| `libs/gstr1/models/jwt` | Pure TypeScript types and JWT payload helpers (`@ramsoft-builder/gstr1/models/jwt`). |
| `libs/gstr1/data-access/gstzen-auth` | Login API, auth store (signals), `localStorage` persistence, HTTP interceptors, route guards (`@ramsoft-builder/gstr1/data-access/gstzen-auth`). |
| `libs/gstr1/feature/login` | Lazy routes under `/gstr1` — GSTZen login page & workspace shell (`@ramsoft-builder/gstr1/feature/login`). |

Suggested additions as the surface grows: `data-access/gstr1-api` (GSTR-1 REST), `ui/*`, `utils/*`.

## Authentication flow

1. **POST** `application/x-www-form-urlencoded` to GSTZen  
   `https://my.gstzen.in/accounts/api/login/token/`  
   Body: `username`, `password` (see [JWT Authentication API](https://my.gstzen.in/docs/api/jwt-authentication-api/)).
2. Response JSON includes `access` and `refresh` JWTs. The **access** token is stored in the browser (`localStorage`, prefix `ramsoft.gstr1.auth` by default).
3. `Gstr1AuthStore` reads `exp` from the access JWT to compute expiry; if missing, it falls back to **24 hours** from the documented token lifetime.
4. **`gstr1BearerInterceptor`** adds `Authorization: Bearer <access>` for HTTP requests whose URL starts with one of the configured **bearer URL prefixes** (dev: `/gstzen-proxy`).
5. **`gstr1UnauthorizedInterceptor`** listens for **401** on the same GSTZen prefixes, clears the session, and navigates to **`/gstr1/login`**.

Ramsoft Web (`apps/ramsoft-web`) registers `$providers`:

- `provideGstr1GstzenAuthConfig(environment.gstr1)`
- `provideHttpClient(withFetch(), withInterceptors([gstr1BearerInterceptor, gstr1UnauthorizedInterceptor]))`

## Environment setup

`apps/ramsoft-web/src/environments/environment.ts` (development) uses the same-origin proxy prefix:

- `loginTokenUrl`: `/gstzen-proxy/accounts/api/login/token/`
- `gstnGenerateOtpUrl`: `/gstzen-proxy/api/gstn-generate-otp/` (GSTN Generate OTP)
- `bearerUrlPrefixes` / `unauthorizedUrlPrefixes`: `['/gstzen-proxy']`

`environment.prod.ts` uses absolute `https://my.gstzen.in` prefixes. The Node SSR server (`apps/ramsoft-web/src/server.ts`) mirrors the Vite dev proxy: `/gstzen-proxy/**` → `https://my.gstzen.in/**`.

Add or adjust `gstr1` on `environment` when deploying behind another host.

## Routing & guards

| Route | Guard | Purpose |
| ----- | ----- | ------- |
| `/gstr1/login` | `gstr1LoginRedirectGuard` | GSTZen login form; redirects to `/home` (or safe `returnUrl`) if a valid token already exists. |
| `/gstr1/workspace` | `gstr1AuthGuard` | Workspace (tokens, shortcuts). |
| `/gstr1/gstn/generate-otp` | `gstr1AuthGuard` | **GSTN Generate OTP** UI (`Gstr1GstnOtpApiService` → `gstnGenerateOtpUrl`). |
| `/gstr1` | — | Redirects to `/gstr1/workspace`. |

Unauthenticated access to protected GSTR-1 routes redirects to `/gstr1/login?returnUrl=...`.

## API usage examples

### Login (already wrapped by `Gstr1GstzenAuthService`)

```http
POST /accounts/api/login/token/
Content-Type: application/x-www-form-urlencoded

username=user%40domain.com&password=secret
```

**Success (excerpt):**

```json
{
  "refresh": "<jwt>",
  "access": "<jwt>"
}
```

**Failure:**

```json
{
  "detail": "No active account found with the given credentials"
}
```

### GSTN Generate OTP (Bearer)

`POST` endpoint (env: `gstnGenerateOtpUrl`):

- Prod: `https://my.gstzen.in/api/gstn-generate-otp/`
- Dev: `/gstzen-proxy/api/gstn-generate-otp/`

```json
{
  "gstin": "29ABCDE1234F1Z5",
  "username": "gst_portal_username"
}
```

Use the in-app page at `/gstr1/gstn/generate-otp` after signing in; the Bearer header is applied by `gstr1BearerInterceptor`.

### Authenticated GSTZen API call (after login)

Any same-origin URL under `/gstzen-proxy/...` receives:

```http
Authorization: Bearer <access>
```

Configure additional prefixes in `environment.gstr1.bearerUrlPrefixes` if you call GSTZen via full HTTPS URLs in the browser.

### Using the store in a component

```typescript
import { Gstr1AuthStore } from '@ramsoft-builder/gstr1/data-access/gstzen-auth';

readonly gstr1 = inject(Gstr1AuthStore);

readonly signedIn = computed(() => this.gstr1.hasValidToken());
```

## Token handling & security notes

- Tokens are persisted in **localStorage** (multi-tab, survives refresh). Refresh the page after login to confirm `Gstr1AuthStore` rehydrates via `Gstr1TokenStorageService`.
- **Logout** (`Gstr1AuthStore.logout()` or “Disconnect” on the workspace page) clears storage and signals.
- Treat `access` / `refresh` as secrets; avoid logging them. The interceptors only attach the access token.
- JWT `exp` is used client-side for **UX**; server-side APIs remain the authority for authorization.

## Integration steps (recap)

1. Add `gstr1` to `environment` (see `gstr1-environment.ts`).
2. Register `provideGstr1GstzenAuthConfig` and the two HTTP interceptors in `app.config.ts`.
3. Lazy-load `gstr1Routes` from `@ramsoft-builder/gstr1/feature/login` under the authenticated shell.
4. Link from the home dashboard to `/gstr1` (or `/gstr1/login`).

## Further reading

- GSTZen JWT Authentication API: https://my.gstzen.in/docs/api/jwt-authentication-api/
