# GSTR-2B domain (`libs/gstr2b`)

Isolated, reusable Nx domain for the GSTZen GSTR-2B auto-drafted ITC statement: summary, all-tables slices, ITC tabs, and reconciliation scaffolding.

## Authentication (required reading)

**Refer GSTR-1 authentication/session establishment flow.** GSTR-2B does not implement login.

- JWT: `Gstr1AuthStore` via `Gstr2bSessionConsumer` (`data-access/services`)
- Bearer: app `gstr1BearerInterceptor` on all GSTZen POSTs
- Login redirect: `/gstr1/login?returnUrl=…`

## Architectural difference vs GSTR-2A

| | GSTR-2A | GSTR-2B |
|---|---------|---------|
| HTTP | One POST **per section** (b2b, cdn, …) | **Single** `POST /api/gstr2/2b/` |
| Parsed shape | Section arrays | `Gstr2bBundle` (`itcSumm`, `cpSumm`, `docData`) |
| Section pages | Fetch + map | `Gstr2bWorkspaceFacade.load` then slice bundle |

## Routes

| Path | Purpose |
|------|---------|
| `/gstr2b/hub` | Section launcher |
| `/gstr2b/summary` | Legacy full UI → `gstr2b-view` until migrated |
| `/gstr2b/b2b` | **Reference** B2B document table |
| `/gstr2b/reconciliation` | Reconciliation scaffold |
| `/gstr1/workspace/gstr2b-view` | Redirects to `/gstr2b/summary` |

## Library map

```
libs/gstr2b/
├── feature/          # Thin pages, routing
├── data-access/      # @Injectable stores, facades, API
├── ui/               # Presentational tables, filters, loaders
├── models/           # Types (no Angular)
├── utils/            # Mappers, constants, helpers
└── shared/           # Pure reconciliation + cache keys (README stubs for session/period)
```

**Note:** Reusable return-period / filter / pagination **stores** live in `data-access/stores` (Angular). `shared/session`, `shared/return-period`, etc. are documentation anchors only.

## Reference vertical slice: B2B

1. Page: `feature/b2b` — query params → `Gstr2bReturnPeriodStore`
2. Facade: `Gstr2bB2bFacade.load` → `Gstr2bWorkspaceFacade` → `gstr2bDocRowsForTable(bundle, 'b2b')`
3. UI: `ui/invoice-table`, `ui/filters`, `ui/loaders`

## Docs

| Doc | Topics |
|-----|--------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Layers, boundaries, lazy loading |
| [docs/DEVELOPER-GUIDE.md](docs/DEVELOPER-GUIDE.md) | Full flows (summary, B2B, ITC, recon, export) |
| [docs/STATE-MANAGEMENT.md](docs/STATE-MANAGEMENT.md) | Stores, facades, signals |
| [docs/API-REFERENCE.md](docs/API-REFERENCE.md) | Statement API, payloads |
| [docs/NAMING-CONVENTIONS.md](docs/NAMING-CONVENTIONS.md) | File/class prefixes |
| [docs/FUTURE-SCALABILITY.md](docs/FUTURE-SCALABILITY.md) | Migration and ITC/recon roadmap |

## Commands

```bash
bash scripts/generate-gstr2b-libs.sh   # scaffold new leaf libs
nx build ramsoft-web
nx lint gstr2b-feature-b2b
```
