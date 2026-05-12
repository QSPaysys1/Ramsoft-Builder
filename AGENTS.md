# AGENTS.md

Guidance for agentic coding tools operating in this Nx monorepo.

## Development Commands

### Build

```bash
nx build <project-name>
nx run-many -t build --all
npm run build:all
```

### Lint

```bash
nx lint <project-name>
```

### Serve Apps

```bash
npm run web:dev
```

Runs the SSR Angular app `ramsoft-web` on port 4200.

## Code Generation

```bash
npm run gen:lib
npm run gen:comp
```

These run [scripts/generate-lib.js](scripts/generate-lib.js) and [scripts/generate-component.js](scripts/generate-component.js). Do **not** use `nx g` directly for libraries or components; use the scripts above.

## Architecture Overview

**Domain-driven layout**: Apps → Feature → Data Access → Shared utilities.

| Path | Purpose |
| ---- | ------- |
| `apps/` | Entry points (`ramsoft-web` SSR Angular app) |
| `libs/{domain}/data-access/` | Services, stores, API access |
| `libs/{domain}/feature/` | Pages, smart components, routing |
| `libs/{domain}/ui/` | Presentational components |
| `libs/{domain}/utils/` | Pure functions, validators, formatters |
| `libs/{domain}/models/` | Interfaces, types, enums |
| `libs/shared/` | Cross-domain utilities and UI |

**Import convention**: `@ramsoft-builder/{domain}/{type}/{name}` (see [tsconfig.base.json](tsconfig.base.json) `paths` after generating libraries).

**Module boundaries** (ESLint): `type:app` → feature, data-access, ui, utils, models, shared; tighten tags in `eslint.config.mjs` as libraries are added.

## Angular Conventions

- **Standalone** components; `ChangeDetectionStrategy.OnPush` where applicable.
- **Inputs/Outputs**: Prefer `input()` / `output()` over decorators.
- **DI**: Prefer `inject()` over constructor injection.
- **Control flow**: `@if`, `@for`, `@switch` (not structural `*ngIf` / `*ngFor`).
- **Styling**: Prefer `[class]` / `[style]` over `ngClass` / `ngStyle`.

## File Generation Rules

- **Do not** auto-create README files in generated libraries unless explicitly requested.
- Generate essential files only (`.ts`, `.html`, `.scss`, `index.ts`).

## Response Guidelines

- Keep changes focused; match existing naming and import style.
- Do not add or run tests unless explicitly asked; fix `nx build` and `nx lint` when touching code.
