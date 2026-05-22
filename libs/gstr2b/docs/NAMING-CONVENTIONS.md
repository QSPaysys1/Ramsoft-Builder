# GSTR-2B naming conventions

| Kind | Pattern | Example |
|------|---------|---------|
| Nx project | `gstr2b-{layer}-{name}` | `gstr2b-feature-b2b` |
| Import path | `@ramsoft-builder/gstr2b/{layer}/{name}` | |
| Store | `Gstr2b{Area}Store` | `Gstr2bWorkspaceStore` |
| Facade | `Gstr2b{Area}Facade` | `Gstr2bB2bFacade` |
| API service | `Gstr2b{Resource}ApiService` | `Gstr2bStatementApiService` |
| Mapper fn | `gstr2b{Verb}{Noun}` | `gstr2bDocRowsForTable` |
| Page | `gstr2b-{section}.page.ts` | `gstr2b-b2b.page.ts` |
| Route path | kebab, under `/gstr2b/` | `/gstr2b/b2b` |
| Constants | `GSTR2B_{NAME}` | `GSTR2B_DOCUMENT_TABLE_COLUMNS` |

Prefix **`Gstr2b`** (camel) / **`gstr2b`** (files) / **`GSTR2B`** (const) — never `Gstr22b` except legacy type `Gstr22bRequestBody` matching GSTZen API spelling.
