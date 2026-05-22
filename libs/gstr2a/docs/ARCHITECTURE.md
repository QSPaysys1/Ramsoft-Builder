# Architecture

## Folder structure purpose

| Path | Purpose |
| ---- | ------- |
| `feature/*` | Route-backed pages; thin templates binding facades/stores |
| `data-access/api` | GSTZen POST wrappers (`Gstr2aGstApiClient`) |
| `data-access/stores` | Signal state (`Gstr2aSectionStoreBase`, section stores) |
| `data-access/facades` | Load orchestration (validate → API → map → store) |
| `data-access/services` | Session consumer, profile |
| `data-access/guards` | `gstr2aAuthGuard` → `gstr1AuthGuard` |
| `ui/*` | Presentational components (no HTTP) |
| `models/*` | DTOs and entities |
| `utils/*` | Pure mappers, constants, helpers |
| `shared/*` | Cross-cutting pure TS (caching, error helpers) |

## API flow (B2B example)

1. `Gstr2aB2bApiService.fetch()` → `Gstr2aGstApiClient.postPeriodJson(gstr2B2bUrl, …)`
2. `GstzenHttpClient.postJson` (gstr1) → `gstr1BearerInterceptor` attaches JWT
3. Raw JSON returned to facade

## Store flow

1. `Gstr2aB2bFacade.load()` sets context on `Gstr2aB2bStore`
2. `resetForLoad()` → `viewState = loading`
3. On success: `rows` + `viewState = success|empty`
4. On failure: `httpError` / `logicalError` + `viewState = error`

## Service flow

- **API services**: one POST per section, no UI state
- **Gstr2aSessionConsumer**: read-only JWT from `Gstr1AuthStore`
- **Gstr2aProfileService**: Supabase legal/trade name for headers

## UI binding flow

Page injects `Gstr2aB2bFacade` + `Gstr2aTableFilterStore` → template reads `facade.viewState()`, `facade.filteredRows()` → `lib-gstr2a-invoice-table` receives `columns` + `rows` inputs.

## Transformation flow

`parseGstr2aB2bSuppliersFromPayload` in `utils/mappers` normalizes GSTZen envelope → `Gstr2aB2bSupplierRow[]`. CSV via `gstr2aB2bRowsToCsv`.

## Lazy loading

`app.routes.ts` → `loadChildren` `@ramsoft-builder/gstr2a/feature/dashboard` → `gstr2aRoutes` → per-section `loadComponent`. Legacy `/gstr1/workspace/gstr2a-*` redirects preserve query params.

## Error handling

`normalizeGstr2aHttpError` + `gstr2aB2bLogicalError` → `gstr2aUserFacingMessage()` for display. See `shared/error-handler`.
