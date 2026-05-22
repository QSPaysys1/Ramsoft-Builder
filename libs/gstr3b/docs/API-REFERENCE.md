# API reference

Configured in `apps/ramsoft-web/src/environments/environment.ts`:

| Key | Method | Purpose |
|-----|--------|---------|
| `gstr3bAutoliabUrl` | POST | Auto-liability tables (summary + fallback) |
| `gstr3bRetsumUrl` | POST | Saved return summary (primary load) |
| `gstr3bRetsaveUrl` | POST | Persist section draft |

## Request shape

All three use GSTIN bearer from GSTR-1 session and body `{ gstin, ret_period }` (retsave adds section payload from `buildGstr3bRetsavePayload`).

## Client

- `Gstr3bGstApiClient` — low-level HTTP
- `Gstr3bApiService` — `fetchGstr3bAutoliab`, `fetchGstr3bRetsum`, `retsaveGstr3bReturn`
- Legacy: `Gstr1GstnOtpApiService` delegates to the same endpoints

## Logical errors

| Helper | When |
|--------|------|
| `gstr3bRetsumLogicalError` | retsum response |
| `gstr3bAutoliabLogicalError` | autoliab response |
| `gstr3bRetsaveLogicalError` | retsave save response |

Parsers live in `utils/mappers` (retsum/autoliab bundle) and `utils/calculators` (retsave form, autoliab form).
