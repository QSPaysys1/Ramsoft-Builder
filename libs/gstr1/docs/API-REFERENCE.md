# GSTZen API reference (GSTR-1 domain)

All URLs are configured in `Gstr1Environment` (`apps/ramsoft-web/src/environments/gstr1-environment.ts`). Development uses `/gstzen-proxy/...`.

## Authentication

### POST login/token/

| Field | Type | Description |
| ----- | ---- | ----------- |
| `username` | string | GSTZen account email |
| `password` | string | GSTZen password |

**Response:** `{ "access": "<jwt>", "refresh": "<jwt>" }`

**Client:** `Gstr1GstzenAuthService.login()` → `Gstr1AuthStore.login()`

---

## GST portal session

### POST gstn-generate-otp/

```json
{ "gstin": "29ABCDE1234F1Z5", "username": "portal_user" }
```

### POST gstn-establish-session/

```json
{ "gstin": "29ABCDE1234F1Z5", "otp": "123456" }
```

### POST gstn-check-session/

```json
{ "gstin": "29ABCDE1234F1Z5" }
```

**Outcomes** (client): `active_session` | `session_expired` | `invalid_gstin` | `ambiguous_no_refresh` — see `deriveGstnCheckSessionUiOutcome()`.

### POST gstn-refresh-session/

```json
{ "gstin": "29ABCDE1234F1Z5" }
```

**Client:** `GstnSessionApiService`, `Gstr1GstnSessionEnsureService`

---

## Returns tracking

### POST rettrack/

```json
{ "gstin": "29ABCDE1234F1Z5", "ret_period": "042026" }
```

**Client:** `GstrReturnsApiService.viewAndTrackReturns()` — `GstrReturnsDashboardStore.search()`

### POST retstatus/

```json
{
  "gstin": "29ABCDE1234F1Z5",
  "ret_period": "042026",
  "reference_id": "<from proceed reset>"
}
```

---

## GSTR-1 download

### POST api/gstr1/download/

```json
{
  "gstin": "29ABCDE1234F1Z5",
  "ret_period": "042026",
  "api_name": "b2b"
}
```

**`api_name` values:** see `GSTR1_DOWNLOAD_API_NAMES` in `gstr1-download.models.ts`.

**Success shape:** `{ "status": 1, "message": { "<api_name>": [ ...records ] } }`

**Special:** `api_name: "retsum"` → summary `sec_sum` for workspace tiles.

**Route-only (no download):** `doc_issue` — retsave only.

**Client:** `Gstr1ApiService.downloadGstr1Return()`, `Gstr1SectionDetailsFacade.downloadSection()`

---

## GSTR-1 retsave

### POST api/gstr1/retsave/

**Envelope:**

```json
{
  "fp": "042026",
  "gstin": "29ABCDE1234F1Z5",
  "gt": 100000,
  "cur_gt": 100000,
  "<sectionKey>": []
}
```

| Section | Retsave key | Notes |
| ------- | ----------- | ----- |
| B2B | `b2b` | Array of `{ ctin, inv: [...] }` |
| B2CL | `b2cl` | |
| B2CS | `b2cs` | |
| CDNR | `cdnr` | |
| CDNUR | `cdnur` | |
| EXP | `exp` | |
| AT | `at` | State-wise |
| ATADJ | `txpd` | Download uses `api_name: "txp"` |
| NIL | `nil` | |
| HSN | `hsn` | Nested `hsn_b2b` / `hsn_b2c` |
| DOCS | `doc_issue` | Table 13 |
| ECO | `ecom` | |
| SUPECOM | `supeco` | Section 9(5) |

**Client:** `Gstr1ApiService.retsaveGstr1Return()`, facades in `gstr1-filing`

---

## GSTR-1 proceed

### POST api/gstr1/reset/

```json
{ "gstin": "29ABCDE1234F1Z5", "ret_period": "042026" }
```

Returns reference id for `retstatus`. **Client:** `Gstr1ApiService.resetGstr1Proceed()`

---

## GSTR-1A

Same patterns with `api/gstr1a/download/` and `api/gstr1a/retsave/` — `Gstr1aApiService`.

---

## Related returns (same JWT)

| Return | Service | Example |
| ------ | ------- | ------- |
| GSTR-2A | `Gstr2ApiService` | `fetchGstr2B2b` |
| GSTR-2B | `Gstr2ApiService` | `fetchGstr22b` |
| GSTR-3B | `Gstr3bApiService` | `fetchGstr3bRetsum` |
