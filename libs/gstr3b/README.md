# GSTR-3B domain (`libs/gstr3b`)

Reusable Nx domain for GSTR-3B: summary liability, section editors, and `retsave`.

## Authentication

**Refer GSTR-1 authentication/session establishment flow.** No separate GSTR-3B login.

- `Gstr3bSessionConsumer` → `Gstr1AuthStore`
- Bearer: `gstr1BearerInterceptor`

## APIs

| Endpoint | Purpose |
|----------|---------|
| `POST /api/gstr3b/autoliab/` | Auto-liability summary tables |
| `POST /api/gstr3b/retsum/` | Saved return (primary load) |
| `POST /api/gstr3b/retsave/` | Save section draft |

## Routes

| Path | Screen |
|------|--------|
| `/gstr3b/summary` | Summary dashboard (tables 3.1–6.1) |
| `/gstr3b/hub` | Section launcher |
| `/gstr3b/outward-supplies` | Table 3.1 supplies |
| `/gstr3b/outward-supplies/eco` | Table 3.1.1 ECO |
| `/gstr3b/outward-supplies/inter` | Table 3.2 inter-state |
| `/gstr3b/itc` | Table 4 ITC |
| `/gstr3b/inward-supplies` | Inward supplies |
| `/gstr3b/interest-late-fee` | Interest & late fee |
| `/gstr3b/payment-tax` | Tax payment / offset |
| `/gstr1/workspace/gstr3b-*` | Legacy redirects → above |

## Migration status

| Phase | Status |
|-------|--------|
| Scaffold (~48 libs) | Done |
| Pure code + gstzen-auth re-exports | Done |
| Data-access (workspace + outward facade) | Done |
| Routes + summary | Done |
| Section pages in `feature/*` | Done |
| Filing / TDS / refund UI | Stub |

## Docs

- [ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [STATE-MANAGEMENT.md](docs/STATE-MANAGEMENT.md)
- [API-REFERENCE.md](docs/API-REFERENCE.md)
- [TAX-CALCULATION.md](docs/TAX-CALCULATION.md)
- [DEVELOPER-GUIDE.md](docs/DEVELOPER-GUIDE.md)
- [MIGRATION.md](docs/MIGRATION.md)
- [FUTURE-SCALABILITY.md](docs/FUTURE-SCALABILITY.md)
