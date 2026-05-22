# GSTR-2B architecture

## Layer responsibilities

| Layer | Responsibility |
|-------|----------------|
| `feature/*` | Route targets, query-param sync, bind facades to UI |
| `data-access/facades` | Orchestrate load: workspace POST → parse → section slice |
| `data-access/stores` | Signal state (`viewState`, `bundle`, `rows`) |
| `data-access/api` | `Gstr2bGstApiClient`, `Gstr2bStatementApiService` |
| `data-access/services` | `Gstr2bSessionConsumer`, errors, profile |
| `utils/mappers` | `parseGstr2bBundle`, `gstr2bDocRowsForTable`, ITC summary rows |
| `utils/constants` | Column defs, ITC tab layouts, hub nav |
| `ui/*` | Dumb components (`input()` / `output()`) |
| `shared/reconciliation` | Pure compare helpers (no HTTP) |

## Session usage

```
User → /gstr1/login → Gstr1AuthStore (JWT)
                    ↓
Gstr2bSessionConsumer (read-only)
                    ↓
gstr1BearerInterceptor → POST gstr22bUrl
```

## API abstraction flow

```
Gstr2bB2bFacade
  → Gstr2bWorkspaceFacade.load()
    → Gstr2bStatementApiService.fetch({ gstin, ret_period })
      → Gstr2bGstApiClient.postPeriodJson(gstr22bUrl, …)
        → GstzenHttpClient (GSTR-1)
  → parseGstr2bBundle(payload) → Gstr2bWorkspaceStore.bundle
  → gstr2bDocRowsForTable(bundle, 'b2b') → Gstr2bB2bStore.rows
```

## Component communication

```
Page (feature/b2b)
  ├─ inject Gstr2bReturnPeriodStore  ← query params
  ├─ inject Gstr2bB2bFacade           ← load / filtered rows
  ├─ inject Gstr2bTableFilterStore    ← search / columns
  └─ template → ui/invoice-table [columns] [rows]
```

## Lazy loading & boundaries

- App route: `path: 'gstr2b'` → `loadChildren` → `gstr2bRoutes`
- Each section: `loadComponent` lazy chunk
- ESLint: `domain:gstr2b` may depend on `gstr2b`, `gstr1`, `auth`, `e-invoices` only

## Reconciliation architecture (target)

1. Load same `Gstr2bBundle` via workspace facade (cache).
2. Build comparison keys from `docData` slices + external books feed.
3. `gstr2bCompareInvoiceKeys` in `shared/reconciliation` → `Gstr2bReconciliationStore.mismatches`.
4. UI: `ui/reconciliation-table`, `ui/mismatch-view` (to be implemented).

## ITC calculation flow

ITC amounts are **pre-aggregated** in `bundle.itcSumm`. Summary UI uses `gstr2bSummaryRowsForTab(bundle, tab)` with layouts in `GSTR2B_ITC_TAB_LAYOUTS` — no client-side tax math beyond formatting (`gstr2bFormatSummaryAmount`).
