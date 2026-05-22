# Future scalability

- **Auto amendment detection** — hook `Gstr1aAmendmentEngine` after GSTR-1 retsum load.
- **Reconciliation engine** — compare filed GSTR-1 vs books before amend draft.
- **Audit tracking** — `models/entities` amendment audit trail + version ids.
- **GST analytics** — aggregate diff summaries across periods.
- **Amendment history versioning** — persist draft snapshots in `shared/caching` or backend.
