# GSTR-1A developer guide

## Lifecycle

1. **Dashboard** — `/gstr1a/hub` with `gstin`, `ret_period` query params.
2. **RETSUM** — `download` with `api_name=retsum` for tile counts.
3. **Section** — `download` with section `api_name` (e.g. `b2b`).
4. **Amendment** — `download` with `*a` api (e.g. `b2ba`); compare via `Gstr1aAmendmentEngine`.
5. **Retsave** — `POST api/gstr1a/retsave/` with section key (`b2ba`, `b2b`, …).

## Add a new amendment section

Copy `feature/b2ba` pattern: facade extending `Gstr1aSectionFacadeBase`, validator in `utils/validators`, route in `gstr1a.routes.ts`.
