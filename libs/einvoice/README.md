# Enterprise E-Invoice (`libs/einvoice`)

Separate Nx domain from legacy [`libs/e-invoices/`](../e-invoices/): same GSTZen NIC JSON model and the **same Supabase table** `public.einvoices` (`user_id`, `base_object`, `gstzen_response`, `sort_date_2`, `created_at`).

## Styling

- Shared form look: [`libs/einvoice/ui/sections/src/lib/einvoice-sections.css`](ui/sections/src/lib/einvoice-sections.css) (cards, inputs, table, light/dark via `prefers-color-scheme`).
- Page chrome + sticky actions + result cards: [`libs/einvoice/feature/flow/src/lib/einvoice-flow-pages.css`](feature/flow/src/lib/einvoice-flow-pages.css).

## Library map

| Path | Import alias | Responsibility |
|------|----------------|----------------|
| `models/nic` | `@ramsoft-builder/einvoice/models/nic` | NIC request/response TypeScript interfaces |
| `utils/core` | `@ramsoft-builder/einvoice/utils/core` | Sanitize JSON, validators, tax helpers, form→NIC mapper, IndexedDB outbox, local draft |
| `data-access/api` | `@ramsoft-builder/einvoice/data-access/api` | `EinvoiceApiService` (IRN POST, IRN cancel), `EwaybillApiService` (genewb POST, **cancelewb** cancel, other EWB stubs) |
| `data-access/persistence` | `@ramsoft-builder/einvoice/data-access/persistence` | `EinvoiceRepository` → `einvoices` insert |
| `data-access/state` | `@ramsoft-builder/einvoice/data-access/state` | `EinvoiceFlowStore` (`@ngrx/signals`: `patchState`, `computed`, async submit) |
| `ui/sections` | `@ramsoft-builder/einvoice/ui/sections` | Presentational form sections + QR view |
| `feature/flow` | `@ramsoft-builder/einvoice/feature/flow` | Routes, shell (store scope + outbox replay), create / success / error pages |

## Routes (app)

Lazy under **`/e-invoice`** (sibling to legacy `/e-invoices/**`):

- `/e-invoice/create` — IRN only (`einvoiceGenUrl`).
- `/e-invoice/create-ewaybill` — IRN + EWB (`einvoiceGenEwbUrl` / `genewb`).
- `/e-invoice/success` — IRN, Ack, optional EWB fields, QR (`SignedQRCode`).
- `/e-invoice/error` — Last error + outbox note.

From the authenticated **home** dashboard, tiles **“GSTZen e-invoice (IRN)”** and **“GSTZen e-invoice + e-way bill”** link to `/e-invoice/create` and `/e-invoice/create-ewaybill` (distinct from legacy **Create E-Invoice** → `/e-invoices/create`).

`EinvoiceShellComponent` provides `EinvoiceFlowStore` for the whole lazy tree so submission state survives navigation to success/error.

## Environment

[`apps/ramsoft-web/src/environments/gstzen-environment.ts`](../../apps/ramsoft-web/src/environments/gstzen-environment.ts) includes:

- `einvoiceGenUrl` — IRN generation.
- `einvoiceGenEwbUrl` — `…/einvoice-json/genewb/`.
- `einvoiceCancelUrl` (optional) — IRN-only cancel; default `…/einvoice-json/cancel/`.
- `einvoiceCancelEwbUrl` (optional) — cancel IRN **with** e-way bill; default `…/einvoice-json/cancelewb/`.
- `token`.

### Cancel IRN + e-way bill (`cancelewb`)

- Call **`EwaybillApiService.cancelIrnWithEwayBill(body)`** with a JSON body that matches [GSTZen’s cancelewb API](https://my.gstzen.in/docs/api/einvoice-api/) (same family as IRN cancel: typically original generate payload plus cancel fields — align with their published schema).
- Shared response handling lives in [`gstzen-cancel-http.ts`](data-access/api/src/lib/gstzen-cancel-http.ts) (`assertGstZenCancelJsonResponse`, `mapGstZenHttpError`), also used by `EinvoiceApiService.cancelIrn`.

`app.config.ts` wires **`EINVOICE_GSTZEN_HTTP_CONFIG`** (enterprise module) alongside existing **`GSTZEN_EINVOICE_CONFIG`** (legacy `e-invoices`).

**Security:** do not ship production API tokens in client bundles; prefer a backend proxy and short-lived credentials.

## End-to-end flow

1. User fills reactive form → **Recalculate taxes** syncs line GST and `ValDtls` from seller/buyer state codes.
2. **Generate** → `EinvoiceFlowStore.submit()` → GSTZen POST → normalize response → `EinvoiceRepository.saveGenerated()` → navigate success (or error).
3. On API/insert failure, payload is **queued in IndexedDB** (`outboxEnqueue`); `EinvoiceShellComponent` replays queued items when online (best-effort; may duplicate rows if a prior failure happened after IRN was issued—treat as operational follow-up).

## Drafts

**Save draft** writes the full form JSON to `localStorage`. **Clear draft** reloads the page after clearing storage.

## Payload

`mapEnterpriseFormToRequest` builds `EinvoiceGenerateRequest` (`Version` 1.1, `TranDtls`, `DocDtls`, parties, `DispDtls` when filled, `ShipDtls`, `ItemList`, `ValDtls`, optional `PayDtls`, `EwbDtls` when route mode is IRN+EWB). Cross-check field-level rules with [GSTZen e-invoice + EWB documentation](https://my.gstzen.in/docs/api/einvoice-api/einvoice-eway-bill-gen/).

## Production deployment

- Configure Supabase URL/keys and GSTZen URLs/tokens via CI/CD secrets and `environment.prod.ts`.
- Consider removing hardcoded tokens from source control.
- For SSR, QR rendering is deferred to the browser on the success page (`showQr` guard).

## Angular version

This workspace targets **Angular 20** (not 19); APIs use standalone components, `inject()`, signals, and `@ngrx/signals` 20.x.
