# GSTR-2A domain — developer guide

Onboarding for the **GSTR-2A** library tree under `libs/gstr2a/`. Routes live at **`/gstr2a/*`**; GSTZen login and JWT stay in **GSTR-1** (`/gstr1/login`).

## Quick links

| Doc | Purpose |
| --- | ------- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Layering and dependency rules |
| [docs/STATE-MANAGEMENT.md](docs/STATE-MANAGEMENT.md) | Stores, facades, signals |
| [docs/API-REFERENCE.md](docs/API-REFERENCE.md) | Endpoints per section |
| [docs/NAMING-CONVENTIONS.md](docs/NAMING-CONVENTIONS.md) | Files, classes, routes |
| [docs/FUTURE-SCALABILITY.md](docs/FUTURE-SCALABILITY.md) | GSTR-2B, reconciliation |

## Layering

```
feature/*  →  data-access/*  →  ui/*, models/*, utils/*, shared/*
                ↓
         gstr1/data-access/gstzen-auth (session, HTTP, env URLs)
```

**Never** import `@ramsoft-builder/gstr1/feature/login` from GSTR-2A.

## Reference section: B2B

| Layer | Type | Symbol |
| ----- | ---- | ------ |
| Page | `feature/b2b` | `Gstr2aB2bPageComponent` |
| Facade | `data-access/facades` | `Gstr2aB2bFacade` |
| Store | `data-access/stores` | `Gstr2aB2bStore` |
| API | `data-access/api` | `Gstr2aB2bApiService` |
| Mapper | `utils/mappers` | `parseGstr2aB2bSuppliersFromPayload` |

## Session

Inject `Gstr2aSessionConsumer` (`data-access/services`) — wraps `Gstr1AuthStore`. No duplicate login.

## Commands

```bash
nx lint gstr2a-feature-b2b
nx lint gstr2a-data-access-facades
nx build ramsoft-web
```

See per-folder `README.md` under each leaf library.
