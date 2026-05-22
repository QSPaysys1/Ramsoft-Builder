# API reference

| Endpoint | Body |
|----------|------|
| `POST /api/gstr1a/download/` | `{ gstin, ret_period, api_name }` |
| `POST /api/gstr1a/retsave/` | `{ fp, gstin, gt, cur_gt, <section>: … }` |

Client: `Gstr1aGstApiClient` / `Gstr1aApiService` in `data-access/api`.

Amendment `api_name` values: `b2ba`, `b2cla`, `b2csa`, `expa`, `cdnra`, `cdnura`, `ata`, `txpa`, `ecoma`, `supecoa` (see `GSTR1A_DOWNLOAD_API_NAMES`).
