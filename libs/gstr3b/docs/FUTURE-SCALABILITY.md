# Future scalability

## Planned feature stubs

- `feature/filing` — portal submit (not in legacy UI)
- `feature/tds-tcs-credit` — TDS/TCS tables when API/UI added
- `feature/refund-adjustment` — refund adjustment workflow
- `feature/exempt-nil-non-gst` — optional dedicated Table 5 editor (today: summary only)

## Extension points

- **Section facades**: Copy `Gstr3bOutwardSuppliesFacade` per table; share `Gstr3bWorkspaceFacade` load.
- **UI kit**: `ui/tax-table`, `ui/loaders`, `ui/empty-state` for repeated section chrome.
- **Annual return / reconciliation**: New feature libs under `libs/gstr3b/feature/` with same data-access boundary.
- **Analytics**: Read-only consumers of `Gstr3bWorkspaceStore` signals without touching retsave builders.

## Auto tax

Any auto-calculation must go through existing `buildGstr3bRetsavePayload` / `withComputedItcNet` to keep GSTZen payloads identical.
