# Naming conventions

| Artifact | Pattern | Example |
| -------- | ------- | ------- |
| Nx project | `gstr2a-{type}-{name}` | `gstr2a-feature-b2b` |
| Import | `@ramsoft-builder/gstr2a/{type}/{name}` | `@ramsoft-builder/gstr2a/feature/b2b` |
| Store | `Gstr2a{Section}Store` | `Gstr2aB2bStore` |
| Facade | `Gstr2a{Section}Facade` | `Gstr2aB2bFacade` |
| API service | `Gstr2a{Section}ApiService` | `Gstr2aB2bApiService` |
| Page | `Gstr2a{Section}PageComponent` | `lib-gstr2a-b2b-page` |
| Route | `/gstr2a/{segment}` | `/gstr2a/b2b` |
| Tags | `domain:gstr2a`, `type:{type}` | ESLint boundaries |

Query params: `gstin`, `ret_period`, `filing_status`.
