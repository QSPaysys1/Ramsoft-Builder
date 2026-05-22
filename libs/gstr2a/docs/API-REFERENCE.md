# API reference

All calls use `Gstr2aGstApiClient` → `GSTR1_GSTZEN_AUTH_CONFIG` URLs (same as GSTR-1 env).

| Section | Service | Config URL key | Method |
| ------- | ------- | -------------- | ------ |
| B2B | `Gstr2aB2bApiService` | `gstr2B2bUrl` | `fetch({ gstin, ret_period })` |
| B2BA | (migrate) | `gstr2B2baUrl` | TBD |
| CDN | (migrate) | `gstr2CdnUrl` | TBD |
| CDNA | (migrate) | `gstr2CdnaUrl` | TBD |
| ECOM | (migrate) | `gstr2EcomUrl` | TBD |
| ECOMA | (migrate) | `gstr2EcomaUrl` | TBD |
| ISD | (migrate) | `gstr2IsdUrl` | TBD |
| TDS/TCS | (migrate) | `gstr2TdstcsUrl` | TBD |
| IMPG | (migrate) | `gstr2ImpgUrl` | TBD |
| IMPG SEZ | (migrate) | `gstr2ImpgsezUrl` | TBD |

Body shape: `{ gstin, ret_period }` (trimmed, GSTIN uppercased).

Legacy implementations remain in `Gstr2ApiService` until each section is migrated.
