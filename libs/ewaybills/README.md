# E-Way Bills (`ewaybills`)

End-to-end module for **standalone** e-way bill generation via **GSTZen** (`ewbapi/generate/`), persistence in **Supabase**, and Angular UI (signals, RxJS, reactive forms, standalone components).

## Folder structure

| Path | Role |
|------|------|
| [`libs/ewaybills/models/ewb`](models/ewb) | TypeScript types: GSTZen request/response shapes, DB row types, status union |
| [`libs/ewaybills/utils/core`](utils/core) | Pure helpers: form → API JSON, response parsing, GSTIN/PIN validators, `sanitizeUndefinedDeep` |
| [`libs/ewaybills/data-access/ewb`](data-access/ewb) | `GstZenEwbApiService`, `EwaybillRepository`, `EwaybillStore`, HTTP config token |
| [`libs/ewaybills/feature/flow`](feature/flow) | Lazy routes: list, create, get, extend, update Part-B, update transporter, `:id` detail |
| [`libs/ewaybills/ui/form`](ui/form) | Reusable `lib-ewb-section-card`, `lib-ewb-inline-alert` |

**Dependency direction:** `feature` → `data-access` → `models` / `utils`; `ui` has no dependency on `data-access`.

## User flow

1. User opens **Home** (`/home`).
2. Clicks **Create E-Way Bill** (footer) or **E-waybills** tile → list (`/ewaybills/list`).
3. Opens **Create** (`/ewaybills/create`), fills invoice / line items / transporter / vehicle.
4. App builds a typed `EwbGenerateRequest`, POSTs to GSTZen with the `Token` header.
5. Response is parsed (`EwbNo` / errors); on success the row is inserted into `public.eway_bills`.
6. **Success** or **error** is shown via `lib-ewb-inline-alert` and `EwaybillStore` signals.
7. **List** and **detail** pages read from Supabase under RLS (`auth.uid() = user_id`).
8. On successful insert, the app **best-effort** increments `user_dashboard_fy.ewaybills` for the active financial year key (same storage keys as the home dashboard).

## Environment variables

Configure in [`apps/ramsoft-web/src/environments/environment.ts`](../../apps/ramsoft-web/src/environments/environment.ts) (and `environment.prod.ts` for production).

| Key | Purpose |
|-----|---------|
| `supabase.url` | Supabase project URL |
| `supabase.anonKey` | Publishable / anon key (RLS still applies) |
| `gstZen.token` | Primary GSTZen `Token` (e-invoice APIs and default standalone e-way) |
| `gstZen.ewbTestToken` | Optional second token; standalone e-way uses it when topbar **EWB test token** is on |
| `gstZen.ewbGenerateUrl` | Optional override; default `https://my.gstzen.in/~gstzen/a/ewbapi/generate/` |
| `gstZen.ewbExtendUrl` | Optional override for extend; default `https://my.gstzen.in/~gstzen/a/ewbapi/extend/` |

Runtime wiring: [`apps/ramsoft-web/src/app/app.config.ts`](../../apps/ramsoft-web/src/app/app.config.ts) provides `GSTZEN_EWB_HTTP_CONFIG` alongside existing GSTZen providers.

**Do not commit production secrets.** Use CI/CD secrets and local overrides for tokens.

## GSTZen setup

1. Add your GSTIN to your GSTZen account (see [GSTZen e-way bill API](https://my.gstzen.in/api/docs/ewaybill-api)).
2. Configure **e-way bill API credentials** in GSTZen as per their documentation.
3. Set `gstZen.token` to the API token issued for your workspace.
4. Confirm the JSON body matches the **NIC Part-A** schema expected by GSTZen for `ewbapi/generate/` (field names may be case-sensitive). Adjust [`libs/ewaybills/utils/core/src/lib/ewb-form-mapper.ts`](utils/core/src/lib/ewb-form-mapper.ts) if your sandbox responses differ.

### CORS

Browser calls to `my.gstzen.in` require GSTZen to allow your web origin. If the browser blocks requests, route traffic through a **backend proxy** and point `ewbGenerateUrl` at your proxy URL.

## Troubleshooting

### “The requested GSTIN is not present in your GSTZen account”

GSTZen validates that the GSTINs in your JSON — typically **consignor (`fromGstin`)** and **consignee (`toGstin`)** — are registered on **their** side for the workspace linked to your **`Token`**. This message means configuration on GSTZen’s side, not a mistake in local validation alone.

1. Sign in at [my.gstzen.in](https://my.gstzen.in) using the account that issued your API token.
2. Under company / GSTIN management, **add or activate** every GSTIN you submit in the form (seller and buyer), including multi-GSTIN setups if applicable.
3. Complete **e-way bill API** onboarding for those GSTINs per [GSTZen e-way bill API](https://my.gstzen.in/api/docs/ewaybill-api).
4. Confirm `gstZen.token` in your environment matches that workspace (sandbox vs production tokens are not interchangeable).

For testing, either register both parties’ GSTINs in GSTZen or temporarily use GSTINs that are already on your GSTZen subscription.

## Supabase setup

1. Apply migration [`supabase/migrations/20260513120000_eway_bills.sql`](../../supabase/migrations/20260513120000_eway_bills.sql) (CLI `supabase db push` or SQL Editor).
2. Table `public.eway_bills` columns:
   - `ewb_number`, `invoice_details`, `transporter_details`, `vehicle_details`, `request_payload`, `generated_response`, `status`, `created_at`, `updated_at`, `user_id`
3. **RLS** policies restrict CRUD to the owning `auth.uid()`.
4. Table is added to **`supabase_realtime`** publication for optional live list updates later.

### SSR note

`SUPABASE_CLIENT` is **null on the server**. List/detail return empty/`null` during SSR; after hydration in the browser, data loads normally. Generation is intended to run **client-side** after login.

## API integration (request / response)

**Service:** [`GstZenEwbApiService`](data-access/ewb/src/lib/gstzen-ewb-api.service.ts)

- **Method:** `POST`
- **Headers:** `Token: <gstZen.token>`, `Content-Type: application/json`, and optionally **`gstin`** (consignor / ship-from, same value as JSON `fromGstin`) when the topbar **GSTZen gstin** option is enabled. GSTZen testing setups often require this header to match Postman; the preference is stored in `localStorage` via [`GstZenEwbHeaderPrefsService`](data-access/ewb/src/lib/gstzen-ewb-header-prefs.service.ts) (default on when unset). The **`Token`** value is `gstZen.token` by default, or `gstZen.ewbTestToken` when topbar **EWB test token** is on ([`GstZenEwbTokenPrefsService`](data-access/ewb/src/lib/gstzen-ewb-token-prefs.service.ts)).
- **Body:** `EwbGenerateRequest` (see [`ewb-gstzen.models.ts`](models/ewb/src/lib/ewb-gstzen.models.ts))

**Example request (redacted):**

```json
{
  "supplyType": "O",
  "subSupplyType": "1",
  "subSupplyDesc": "",
  "docType": "INV",
  "docNo": "INV-1001",
  "docDate": "13/05/2026",
  "fromGstin": "29AAFCC9980M1ZR",
  "fromTrdName": "Seller Pvt Ltd",
  "fromAddr1": "1 MG Road",
  "fromAddr2": "",
  "fromPlace": "Bengaluru",
  "fromPincode": 560001,
  "actFromStateCode": 29,
  "fromStateCode": 29,
  "toGstin": "27AAAAA0000A1Z5",
  "toTrdName": "Buyer LLP",
  "toAddr1": "2 FC Road",
  "toAddr2": "",
  "toPlace": "Pune",
  "toPincode": 411004,
  "actToStateCode": 27,
  "toStateCode": 27,
  "transactionType": 1,
  "otherValue": "0",
  "totalValue": 100000,
  "cgstValue": 0,
  "sgstValue": 0,
  "igstValue": 18000,
  "cessValue": 0,
  "cessNonAdvolValue": 0,
  "totInvValue": 118000,
  "transporterId": "",
  "transporterName": "",
  "transDocNo": "",
  "transMode": "1",
  "transDistance": "120",
  "transDocDate": "",
  "vehicleNo": "KA01AB1234",
  "vehicleType": "R",
  "itemList": [
    {
      "productName": "Widget",
      "productDesc": "Widget",
      "hsnCode": 8544,
      "quantity": 10,
      "qtyUnit": "NOS",
      "cgstRate": 0,
      "sgstRate": 0,
      "igstRate": 18,
      "cessRate": 0,
      "cessNonadvol": 0,
      "taxableAmount": 100000
    }
  ]
}
```

**Example success response (illustrative):** GSTZen/NIC may return `EwbNo`, `EwbDt`, `ValidUpto`, or nest values under `SignedEwb`. The parser in [`parseEwbGenerateResponse`](utils/core/src/lib/ewb-form-mapper.ts) normalizes several variants.

**Errors:** Logical errors often return HTTP 200 with `Success: "N"` or `ErrorDetails[]`. These are turned into `EwbGstZenApiError` with a readable message.

**Extend:** [`extend()`](data-access/ewb/src/lib/gstzen-ewb-api.service.ts) POSTs typed `EwbExtendRequest` to `ewbapi/extend/`; responses are normalized by [`parseEwbExtendResponse`](utils/core/src/lib/ewb-form-mapper.ts). Successful extends are logged into `eway_bill_transport_updates` with `__transportOp: 'extend'` on `request_payload` (see [`EwaybillStore.submitExtendUpdate`](data-access/ewb/src/lib/ewaybill.store.ts)).

## Persistence policy

- **Only successful GSTZen generations** are inserted (`status = 'generated'`). Failed API calls do **not** create a row (avoids clutter); the error is shown in UI only.
- Full outbound JSON is stored in `request_payload` for audit/support.

## Nx commands

```bash
nx build ramsoft-web
nx lint ewaybills-data-access-ewb
nx lint ewaybills-feature-flow
nx lint ewaybills-ui-form
```

## Generating more libraries in this domain

Use the repo script (not raw `nx g` for libs):

```bash
node scripts/generate-lib.js angular ewaybills feature my-feature "type:feature,domain:ewaybills"
```

## Related code in this repo

- GSTZen **e-invoice** patterns: [`libs/einvoice/data-access/api`](../einvoice/data-access/api), [`libs/e-invoices/README.md`](../e-invoices/README.md)
- Supabase client: [`libs/shared/data-access/supabase`](../shared/data-access/supabase)
