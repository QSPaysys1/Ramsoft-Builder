# GSTR-1A migration

## Status

| Phase | Status |
|-------|--------|
| Scaffold `libs/gstr1a` | Done |
| Core API / stores / facades | Done |
| `/gstr1a` routes + legacy redirects | Done |
| Primary section pages moved | Done |
| B2BA reference (comparison + retsave) | Done |
| Other `*a` sections | Generic amend page + download |
| Filing proceed API | Future (GSTR-1 only today) |

## Route map

See `utils/constants/gstr1a-legacy-routes.ts`.

## Code map

| Old | New |
|-----|-----|
| `gstr1/feature/login/.../gstr1a-*.page.ts` | `gstr1a/feature/*` |
| `Gstr1aApiService` in gstzen-auth | `gstr1a/data-access/api` (parallel) |
| `gstr1-download-workspace.constants` amend tiles | `gstr1a/utils/constants` |
