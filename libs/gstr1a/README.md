# GSTR-1A (Amendments / Corrections)

Enterprise Nx domain for GSTR-1A outward supply amendments.

**Session:** Refer GSTR-1 authentication/session establishment flow (`/gstr1/login`). This domain uses `Gstr1AuthStore` via `Gstr1aSessionConsumer` — no separate login.

## Routes

| New | Legacy redirect |
|-----|-----------------|
| `/gstr1a/hub` | `/gstr1/workspace/gstr1a-view` |
| `/gstr1a/b2b` | `/gstr1/workspace/gstr1a-b2b/:gstin/:retPeriod` |
| `/gstr1a/b2ba` | `…/amend-b2b` |

## Docs

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/DEVELOPER-GUIDE.md](docs/DEVELOPER-GUIDE.md), [docs/MIGRATION.md](docs/MIGRATION.md).

## Commands

```bash
nx build ramsoft-web
nx lint gstr1a-data-access-api
```
