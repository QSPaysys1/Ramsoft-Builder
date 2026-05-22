# GSTR-2B state management

Signals + facades (no NgRx). Pattern mirrors GSTR-2A with a **workspace** store for the single statement.

## Stores

| Store | Role |
|-------|------|
| `Gstr2bReturnPeriodStore` | GSTIN, `ret_period`, filing label; syncs query params |
| `Gstr2bWorkspaceStore` | `bundle`, `viewState`, errors, `cacheKey` |
| `Gstr2bB2bStore` | Section `rows` + `viewState` (extends `Gstr2bSectionStoreBase`) |
| `Gstr2bTableFilterStore` | Search + column visibility |
| `Gstr2bPaginationStore` | Page size / index for large tables |
| `Gstr2bReconciliationStore` | Mismatch list scaffold |

## Facades

| Facade | Role |
|--------|------|
| `Gstr2bWorkspaceFacade` | POST statement, parse bundle, session cache by `gstr2bStatementCacheKey` |
| `Gstr2bBundleSectionFacadeBase` | Ensures workspace loaded, maps bundle → rows |
| `Gstr2bB2bFacade` | `gstr2bDocRowsForTable(bundle, 'b2b')`, CSV export |

## View states

`idle` → `loading` → `success` | `empty` | `error`

Section pages should use **`Gstr2bReturnPeriodStore.paramsValid()`** for “missing GSTIN/period” — not section store GSTIN before first `load()`.

## Caching

In-memory only for the SPA session: if `cacheKey` matches and `viewState === 'success'`, `WorkspaceFacade.load` skips HTTP unless `force=true`.

## Error handling

- HTTP: `normalizeGstr2bHttpError` → `httpError` signal
- GSTZen logical: `gstr22bLogicalError(payload)` → `logicalError` signal
- UI: `gstr2bUserFacingMessage(http, logical)`

## Retry

Pages call `facade.load(...)` on Refresh; pass `force: true` on workspace when invalidating cache (extend facade when needed).
