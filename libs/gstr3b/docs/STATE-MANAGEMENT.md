# State management

## Signals

All GSTR-3B stores use Angular `signal()` / `computed()` (OnPush-friendly).

## `Gstr3bReturnPeriodStore`

Wraps `GstrReturnPeriodStore` from GSTR-1 returns. Syncs `gstin`, `ret_period`, `filing_status` from query params.

## `Gstr3bWorkspaceStore`

| Signal | Purpose |
|--------|---------|
| `autoliabBundle` | Summary tables from autoliab (view/summary fallback) |
| `retsaveForm` | Full draft for retsave merges |
| `viewState` | `idle` \| `loading` \| `ready` \| `error` |
| `logicalError` | Parser / GSTZen logical errors |
| `cacheKey` | `GSTIN+ret_period` — skip duplicate loads |

## `Gstr3bWorkspaceFacade`

- `ensureRetsaveForm(gstin, period)` — retsum-first load (documented inline in source).
- Used by section facades instead of duplicating ~40 lines per page.

## Section stores

`Gstr3bSectionStoreBase` — per-section `viewState`, `logicalError`, `retsaveSubmitting`, `retsaveMessage`.

Reference: `Gstr3bOutwardSuppliesStore` + `Gstr3bOutwardSuppliesFacade` for Table 3.1 `sup_details`.
