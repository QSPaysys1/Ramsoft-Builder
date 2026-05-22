# Developer guide

## Session

Refer **GSTR-1 authentication/session establishment flow**. Open GSTR-3B from Returns dashboard with `gstin`, `ret_period`, optional `filing_status` query params.

## Flow: dashboard → summary → section

| Step | Route | API | Store/facade |
|------|-------|-----|--------------|
| Returns tile | `/gstr3b/summary` | — | Query → period store |
| Summary load | `/gstr3b/summary` | retsum → autoliab | Page or `Gstr3bWorkspaceFacade` |
| Section edit | e.g. `/gstr3b/outward-supplies` | retsum → autoliab on load; retsave on save | `Gstr3bOutwardSuppliesFacade` (reference) |
| Retry | Same route | Repeat load | `load()` / `loadDetails()` |
| Cache | Same GSTIN+period | Skip if `cacheKey` matches | `Gstr3bWorkspaceFacade` |

## Reference section: outward supplies (3.1)

1. **Load**: `Gstr3bOutwardSuppliesFacade.load()` → `workspaceFacade.ensureRetsaveForm()` → clone `sup_details` to draft.
2. **Edit**: Template binds `draftSupDetails()` (ngModel).
3. **Save**: `save()` → `withComputedItcNet` + `buildGstr3bRetsavePayload` → `retsaveGstr3bReturn`.
4. **Validation**: `paramsValid` (15-char GSTIN + `GSTR3B_RETURN_PERIOD_REGEX`).
5. **Errors**: `logicalError`, `retsaveMessage`; retry button calls `loadDetails()`.

## Other sections (same pattern, page-local load today)

| Screen | Route | Draft key |
|--------|-------|-----------|
| ECO 3.1.1 | `/gstr3b/outward-supplies/eco` | `eco_dtls` |
| Inter-state 3.2 | `/gstr3b/outward-supplies/inter` | `inter_sup` |
| ITC 4 | `/gstr3b/itc` | `itc_elg` |
| Inward 5 | `/gstr3b/inward-supplies` | `inward_sup` |
| Interest 5.1 | `/gstr3b/interest-late-fee` | `intr_ltfee` |
| Payment 6.1 | `/gstr3b/payment-tax` | `tx_pmt` |

Future: thin pages + section facades mirroring outward supplies.

## Filing

Portal filing is **not implemented**. `feature/filing` is a stub; only per-section `retsave` exists today.
