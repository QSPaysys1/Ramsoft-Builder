# GSTR-2B developer guide

End-to-end flows for implementing summary, invoice sections, ITC, and reconciliation without page-level business logic.

**Session:** Refer GSTR-1 authentication/session establishment flow. Use `Gstr2bSessionConsumer` only.

---

## 1. Summary APIs (ITC tabs)

| Step | Detail |
|------|--------|
| **API** | `POST /api/gstr2/2b/` (same as all sections) |
| **Request** | `{ gstin, ret_period }` |
| **Response** | Envelope → `parseGstr2bBundle` → `bundle.itcSumm` |
| **Transform** | `gstr2bSummaryRowsForTab(bundle, tab)` + `GSTR2B_ITC_TAB_LAYOUTS` |
| **Store** | `Gstr2bWorkspaceStore.bundle` |
| **Service** | `Gstr2bWorkspaceFacade` |
| **UI** | `feature/summary` (migrate from `gstr2b-view`) — summary table + ITC tabs |
| **Errors** | `gstr22bLogicalError`; HTTP via interceptor / `httpError` |
| **Retry** | Hub Refresh → `load(..., force: true)` |
| **Cache** | `gstr2bStatementCacheKey` on workspace store |

---

## 2. B2B invoices (reference implementation)

| Step | Detail |
|------|--------|
| **API** | Statement POST (no separate B2B URL) |
| **Slice key** | `docData.b2b` — `gstr2bDocRowsForTable(bundle, 'b2b')` |
| **Store** | `Gstr2bB2bStore.rows` |
| **Facade** | `Gstr2bB2bFacade` extends `Gstr2bBundleSectionFacadeBase` |
| **UI** | `/gstr2b/b2b` → `Gstr2bInvoiceTableComponent` |
| **Filter** | `Gstr2bTableFilterStore` on GSTIN, trade name, invoice number |
| **Export** | `gstr2bDocRowsToCsv` + browser download in page |
| **Pagination** | `Gstr2bPaginationStore.paginatedSlice` (wired on B2B page) |

**Add a new document section:** copy B2B facade/store/page; change `GSTR2B_B2B_DOC_KEY` to `cdnr`, `isd`, etc. (`utils/constants/gstr2b-section-keys.ts`).

---

## 3. Amended invoices (B2BA)

| | |
|---|---|
| **Slice** | `b2ba` in `docData` / `cpSumm` |
| **Route** | `/gstr2b/b2ba` → legacy until `feature/b2ba` ported |
| **Columns** | Same document columns; filter invoice type in UI when migrated |

---

## 4. CDN / CDNA

| Section | Key |
|---------|-----|
| Debit notes | `cdnr` |
| Amendments | `cdnra` |

Supplier-wise: `gstr2bCpSummRowsForTable(bundle, key)`. Document: `gstr2bDocRowsForTable`.

---

## 5. ISD / ISDA

Keys `isd`, `isda`. CP summary rows include ISD-specific fields (`noteType`, `documentType`).

---

## 6. Import invoices (IMPG / IMPGSEZ)

Keys `impg`, `impgsez`. Port codes appear on `Gstr2bCpSummRow.portCode`.

---

## 7. ITC availability

| Tab | Key | Layout constant |
|-----|-----|-----------------|
| Available | `itcavl` | `GSTR2B_ITC_AVL_LAYOUT` |
| Not available | `itcunavl` | `GSTR2B_ITC_UNAVL_LAYOUT` |
| Reversal | `itcrev` | `GSTR2B_ITC_REV_LAYOUT` |
| Rejected | `itcrej` | `GSTR2B_ITC_REJ_LAYOUT` |

**Flow:** workspace bundle → `gstr2bSummaryRowsForTab` → presentational table in `feature/itc-summary` (future). Document-level ITC flags: `Gstr2bDocRow.itcAvailability`, `itcAvailabilityCode`.

---

## 8. Reconciliation flow

| Step | Detail |
|------|--------|
| **Data** | GSTR-2B docs from bundle slices; books from external service (TBD) |
| **Compare** | `gstr2bInvoiceKey(gstin, inv, date)` in `shared/reconciliation` |
| **Store** | `Gstr2bReconciliationStore.mismatches` |
| **UI** | `feature/reconciliation` scaffold → `ui/reconciliation-table`, `ui/mismatch-view` |

---

## 9. Mismatch identification

Kinds: `missing_in_books`, `missing_in_2b`, `amount_mismatch`, `itc_mismatch` (`Gstr2bMismatchKind`). Extend `gstr2bCompareInvoiceKeys` with tax field diff.

---

## 10. Vendor comparison

Use CP summary: `gstr2bCpSummRowsForTable(bundle, cpSummKey)` grouped by `supplierGstin`. Reconciliation should match vendor GSTIN before invoice-level compare.

---

## 11. Invoice drilldown

Pattern: CP row click → navigate to document sub-tab with `Gstr2bTableFilterStore.searchQuery` preset to supplier GSTIN (implement in summary feature).

---

## 12. Filtering / search / pagination

| Concern | Owner |
|---------|--------|
| Text search | `Gstr2bTableFilterStore.searchQuery` |
| Column picker | `Gstr2bTableFilterStore.columnVisibility` |
| Page size | `GSTR2B_RECORDS_PER_PAGE_OPTIONS` |
| Pages | `Gstr2bPaginationStore` |

---

## 13. Export / download

Client-side CSV from filtered rows (`gstr2bDocRowsToCsv`). No separate export API in current GSTZen integration.

---

## Error / retry / caching (all flows)

| Concern | Implementation |
|---------|----------------|
| **HTTP errors** | `Gstr2bWorkspaceStore.httpError`, 401 → GSTR-1 unauthorized interceptor |
| **Logical errors** | `gstr22bLogicalError` after coerce |
| **Retry** | User Refresh; optional `force` on workspace load |
| **Cache** | In-memory `cacheKey` on workspace store |

---

## Checklist: new section

1. Add route in `gstr2b.routes.ts` with `loadComponent`.
2. Create `Gstr2b{X}Store` + `Gstr2b{X}Facade` (slice key from `GSTR2B_SECTION_ROUTES`).
3. Page: sync `Gstr2bReturnPeriodStore`, call `facade.load`, bind `ui/*`.
4. Document flow in this file + `API-REFERENCE.md`.
5. `nx build ramsoft-web` + `nx lint gstr2b-feature-{x}`.
