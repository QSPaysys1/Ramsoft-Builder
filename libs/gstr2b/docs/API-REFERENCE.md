# GSTR-2B API reference

## Statement (only production API today)

| | |
|---|---|
| **Service** | `Gstr2bStatementApiService` |
| **URL** | `GSTR1_GSTZEN_AUTH_CONFIG.gstr22bUrl` → `POST /api/gstr2/2b/` |
| **Auth** | Bearer (GSTR-1 session) |

### Request

```json
{ "gstin": "29AAAAA0000A1Z5", "ret_period": "042026" }
```

Type: `Gstr22bRequestBody` (`models/requests`).

### Response

GSTZen envelope → `gstr2CoercePayloadRoot` → `parseGstr2bBundle` →:

```ts
interface Gstr2bBundle {
  header: Gstr2bHeaderMeta;
  itcSumm: Record<string, unknown>;
  cpSumm: Record<string, unknown>;
  docData: Record<string, unknown>;
}
```

### Section slices (no extra HTTP)

| UI section | `docData` / `cpSumm` key |
|------------|--------------------------|
| B2B | `b2b` |
| B2BA | `b2ba` |
| CDN | `cdnr` |
| CDNA | `cdnra` |
| ISD / ISDA | `isd` / `isda` |
| IMPG / IMPGSEZ | `impg` / `impgsez` |
| ECOM / ECOMA | `ecom` / `ecoma` |

Extractors: `gstr2bDocRowsForTable`, `gstr2bCpSummRowsForTable`.

### ITC summary tabs

Keys: `itcavl`, `itcunavl`, `itcrev`, `itcrej` — rows via `gstr2bSummaryRowsForTab(bundle, tab)`.

### Success / error

- `isGstr22bSuccessEnvelope(payload)`
- `gstr22bLogicalError(payload)` → user message or null
