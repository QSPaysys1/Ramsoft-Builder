# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Executive snapshot

Nx monorepo (Nx 21.6.11, Angular 20, TypeScript 5.8) with a single SSR Angular web app `ramsoft-web`. Path aliases use the `@ramsoft-builder` scope.

## Critical project rules

- **No tests during implementation** — Do not add, edit, or run test files unless explicitly asked. Fix `nx build` and `nx lint` only.
- **No README generation** — Do not auto-create README.md files unless explicitly requested.
- **Use custom generators** — Use `npm run gen:lib` / `npm run gen:comp`. Do **not** use `nx g` directly for those cases.

## Common commands

| Task | Command |
| ---- | ------- |
| Build a project | `nx build <project>` |
| Lint a project | `nx lint <project>` |
| Build all | `npm run build:all` |
| Generate library | `npm run gen:lib` (interactive or CLI args) |
| Generate component | `npm run gen:comp` (interactive or CLI args) |
| Dev server (SSR) | `npm run web:dev` |

### Library generation

```bash
node scripts/generate-lib.js <libraryType> <domain> <type> <name> [tags] [buildable]

# Interactive:
node scripts/generate-lib.js --interactive
```

Library types: `angular` (feature, ui, data-access) or `js` (utils, models).

## Apps

- **ramsoft-web** — Angular SSR application (`apps/ramsoft-web`).

## Library organization (`libs/`)

Use domains (for example `core`, `shared`) and types: `feature`, `data-access`, `ui`, `utils`, `models`.

Import convention: `@ramsoft-builder/{domain}/{type}/{name}` mapped in [tsconfig.base.json](tsconfig.base.json).

## Angular conventions

- Standalone components.
- `ChangeDetectionStrategy.OnPush` for new components.
- `input()` / `output()` and `inject()` preferred over decorator-based APIs.
- Reactive forms where forms are needed.
- `@if`, `@for`, `@switch` control flow.

## Response style

Keep responses short and direct. Prefer showing minimal diffs over long explanations.
