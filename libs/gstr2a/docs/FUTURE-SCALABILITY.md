# Future scalability

## GSTR-2B

Clone `libs/gstr2b/` with the same taxonomy. Share:

- Session consumer pattern (GSTZen JWT via GSTR-1)
- `Gstr2aGstApiClient` → rename to `GstReadApiClient` with `GST_READ_API_CONFIG`
- `ui/invoice-table`, table filter store, return period store

## Reconciliation

Add `libs/reconciliation/` consuming shared period + match stores; keep GSTR-2A sections read-only.

## Extract `libs/gst-shared/`

When GSTR-2B starts, move from `gstr2a/shared/*` and `data-access/services` session adapter into `gst-shared` to avoid cross-domain duplication.

## ISDA

`feature/isda` is scaffolded; route redirects to legacy until GSTZen API is confirmed.
