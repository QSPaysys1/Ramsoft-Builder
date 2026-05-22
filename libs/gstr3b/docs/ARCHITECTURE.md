# GSTR-3B architecture

## Layers

| Layer | Path | Responsibility |
|-------|------|----------------|
| App | `apps/ramsoft-web` | `/gstr3b` lazy routes |
| Feature | `libs/gstr3b/feature/*` | Pages, routing shell |
| Data access | `libs/gstr3b/data-access/*` | API client, stores, facades, guards |
| Models | `libs/gstr3b/models/*` | Entities, requests, enums |
| Utils | `libs/gstr3b/utils/*` | Mappers, calculators, constants, helpers |
| Shared | `libs/gstr3b/shared/*` | Cache keys, cross-cutting stubs |

## Boundaries

- Feature libraries depend on data-access, utils, models — not on `gstr1/feature`.
- Auth stays in GSTR-1: `gstr3bAuthGuard` delegates to `gstr1AuthGuard`.
- `gstzen-auth` re-exports `@ramsoft-builder/gstr3b/*` for backward compatibility during migration.

## Load sequence (all screens)

1. `POST retsum` — primary saved return
2. On parse failure → `POST autoliab` — auto-liability draft
3. Section save → `POST retsave` with `buildGstr3bRetsavePayload`

Centralized in `Gstr3bWorkspaceFacade.ensureRetsaveForm()`; outward supplies uses `Gstr3bOutwardSuppliesFacade` as the reference section pattern.

## Lazy loading

`gstr3bRoutes` in `feature/dashboard` loads section pages on demand. Legacy `/gstr1/workspace/gstr3b-*` routes redirect one-way to `/gstr3b/*` (no loop back).
