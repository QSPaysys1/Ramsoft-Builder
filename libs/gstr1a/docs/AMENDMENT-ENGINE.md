# Amendment engine

`Gstr1aAmendmentEngine` (`shared/amendment-engine`):

1. `fetchOriginal` — GSTR-1 download (primary `api_name`).
2. `fetchAmendment` — GSTR-1A download (`*a` api).
3. `buildDiffs` — field-level deltas via `utils/diff-utils`.

Used by `Gstr1aB2baFacade.loadWithComparison()`.
