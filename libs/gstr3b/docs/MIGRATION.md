# Migration

## Route map

| Legacy (`/gstr1/workspace/…`) | New (`/gstr3b/…`) |
|-------------------------------|-------------------|
| `gstr3b-view` | `summary` |
| `gstr3b-sup-details` | `outward-supplies` |
| `gstr3b-eco-details` | `outward-supplies/eco` |
| `gstr3b-inter-sup-details` | `outward-supplies/inter` |
| `gstr3b-itc-details` | `itc` |
| `gstr3b-inward-sup-details` | `inward-supplies` |
| `gstr3b-intr-ltfee-details` | `interest-late-fee` |
| `gstr3b-payment-details` | `payment-tax` |

Redirects: `Gstr3bRouteRedirectPageComponent` in `gstr1/feature/login` (one-way; `/gstr3b/summary` loads real page).

## Code map

| Old (`gstzen-auth`) | New |
|---------------------|-----|
| `gstr3b.models.ts` | `models/entities`, `models/requests` |
| `gstr3b-payload.utils.ts` | `utils/mappers` (autoliab) |
| `gstr3b-retsum.utils.ts` | `utils/mappers` (retsum) |
| `gstr3b-retsave.utils.ts` | `utils/calculators` |
| `gstr3b-tx-pmt.utils.ts` | `utils/calculators` (tx_pmt) |
| `gstr3b-api.service.ts` | `data-access/api` (wrapper kept in gstzen-auth) |

## Re-exports

`libs/gstr1/data-access/gstzen-auth/src/lib/gstr3b*.ts` re-export `@ramsoft-builder/gstr3b/*` until all call sites migrate.

## Status

| Area | Status |
|------|--------|
| Scaffold + pure code move | Done |
| Routes + summary | Done |
| Outward supplies + facade | Done |
| Other section pages | Migrated to feature libs; facades optional |
| Filing / TDS / refund UI | Stub only |
| Exempt-nil | On summary Table 5 |
