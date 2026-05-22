# GSTR-2B future scalability

## Migration status

| Area | Status |
|------|--------|
| Domain scaffold | Done (`scripts/generate-gstr2b-libs.sh`) |
| Workspace + statement API | Done |
| B2B documents (`/gstr2b/b2b`) | Reference slice done |
| Summary / all tables | `feature/summary` at `/gstr2b/summary` |
| Other sections | Hub → legacy until ported |
| Reconciliation UI | Store + pure compare helpers only |

## Next steps

1. Move `gstr2b-view.page` into `feature/summary` using `Gstr2bWorkspaceFacade` (no page-level API).
2. Add `Gstr2b{Cdn,Isd,...}Facade` extending `Gstr2bBundleSectionFacadeBase` per section key.
3. Implement `ui/reconciliation-table` + books data-access adapter.
4. Optional: persist workspace cache in `sessionStorage` keyed by `gstr2bStatementCacheKey`.
5. Vendor comparison: extend `gstr2bCompareInvoiceKeys` with tax totals and ITC flags.

## Reuse for other modules

- `Gstr2bReturnPeriodStore` — any GST return workspace under same GSTIN/period.
- `Gstr2bGstApiClient` — add methods if GSTZen adds GSTR-2B sub-endpoints.
- `shared/reconciliation` — shared with purchase register / GSTR-2A matching.
