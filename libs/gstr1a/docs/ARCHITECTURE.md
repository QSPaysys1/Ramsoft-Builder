# GSTR-1A architecture

## Layers

| Layer | Path | Role |
|-------|------|------|
| feature | `libs/gstr1a/feature/*` | Smart pages, routing |
| data-access | `libs/gstr1a/data-access/*` | API, stores, facades, guards |
| ui | `libs/gstr1a/ui/*` | Presentational components |
| models | `libs/gstr1a/models/*` | Types, DTOs |
| utils | `libs/gstr1a/utils/*` | Mappers, validators, diff |
| shared | `libs/gstr1a/shared/*` | Amendment engine, caching |

## Session

`Gstr1aSessionConsumer` reads `Gstr1AuthStore`. `gstr1aAuthGuard` aliases `gstr1AuthGuard`.

## Reference section

B2BA: `feature/b2ba` + `Gstr1aB2baFacade` + `Gstr1aAmendmentEngine` + `ui/invoice-comparison`.
