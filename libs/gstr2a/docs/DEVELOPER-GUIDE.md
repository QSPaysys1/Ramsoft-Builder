# GSTR-2A developer guide (10 topics)

Each topic lists **API**, **store**, **service**, **UI binding**, and **mapping** flows.

## 1. Folder structure

| Folder | API | Store | Service | UI | Mapping |
| ------ | --- | ----- | ------- | -- | ------- |
| `feature/b2b` | — | binds facade | — | template | — |
| `data-access/api` | `Gstr2aB2bApiService` | — | HTTP only | — | — |
| `data-access/facades` | calls API | updates store | orchestration | — | calls mappers |
| `data-access/stores` | — | signals | — | read by page | — |
| `utils/mappers` | — | — | — | — | `parseGstr2aB2bSuppliersFromPayload` |

## 2. Service responsibilities

- **API services**: one GSTZen POST per section; no signals.
- **Gstr2aSessionConsumer**: read `Gstr1AuthStore` (no login UI here).
- **Gstr2aProfileService**: Supabase legal/trade name for headers.
- **Gstr2aGstApiClient**: shared `postPeriodJson` + URL getters from env config.

## 3. Store responsibilities

- **Gstr2aReturnPeriodStore**: GSTIN + `ret_period` with GSTR-1 FY store.
- **Gstr2aTableFilterStore**: search + column visibility.
- **Gstr2aB2bStore**: section rows + `viewState` + errors.

## 4. API abstraction

`Page → Facade → Gstr2aB2bApiService → Gstr2aGstApiClient → GstzenHttpClient → interceptor → GSTZen`.

## 5. Shared session

Inject `Gstr2aSessionConsumer`. Unauthenticated users use `/gstr1/login?returnUrl=…`. JWT interceptors remain in `app.config.ts`.

## 6. State management

Signals only. Facade `load()` is the single write path for section data. Filters stay in `Gstr2aTableFilterStore` (computed `filteredRows` on facade).

## 7. Component communication

- Parent page injects facade + filter store.
- Presentational `ui/*` components use `input()` / `output()` only.
- Query params ↔ `Gstr2aReturnPeriodStore.syncFromQueryParams`.

## 8. Lazy loading / boundaries

- App: `/gstr2a` → `gstr2aRoutes` in `feature/dashboard`.
- Sections: `loadComponent` per feature lib.
- ESLint: `domain:gstr2a` may depend on `gstr2a`, `gstr1`, `auth`, `e-invoices` — not `gstr1/feature/login`.

## 9. Reusable patterns

- Extend `Gstr2aSectionStoreBase` + `Gstr2aSectionFacadeBase`.
- Add `Gstr2a{Section}ApiService` + mapper in `utils/mappers`.
- Reuse `ui/invoice-table`, `ui/filters`, `ui/summary-cards`.

## 10. Error handling

1. HTTP → `normalizeGstr2aHttpError` (`data-access/services`).
2. Envelope → `gstr2aB2bLogicalError` (mapper).
3. UI → `gstr2aUserFacingMessage(httpError, logicalError)`.

Legacy `/gstr1/workspace/gstr2a-*` routes redirect to `/gstr2a/*` with query params preserved.
