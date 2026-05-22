#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

write_readme() {
  local type="$1" name="$2" purpose="$3"
  cat > "$ROOT/libs/gstr2b/${type}/${name}/README.md" <<EOF
# gstr2b / ${type} / ${name}

${purpose}

Import: \`@ramsoft-builder/gstr2b/${type}/${name}\`

See [libs/gstr2b/README.md](../../README.md).
EOF
}

write_readme feature dashboard "Routes shell, hub, and \`gstr2bRoutes\`."
write_readme feature b2b "B2B document slice (reference implementation)."
write_readme feature summary "Full summary/all-tables UI (legacy redirect until migrated)."
write_readme feature reconciliation "Books vs GSTR-2B reconciliation workspace."
write_readme data-access api "GST API client and statement POST service."
write_readme data-access stores "Workspace + section signal stores."
write_readme data-access facades "Workspace load and bundle section facades."
write_readme data-access services "Session consumer (GSTR-1), errors, profile."
write_readme data-access guards "Auth guard wrapping GSTR-1 JWT."
write_readme utils mappers "parseGstr2bBundle and table row extractors."
write_readme utils constants "ITC layouts, table columns, hub navigation."
write_readme shared reconciliation "Invoice key compare utilities."
write_readme shared caching "Statement cache key helpers."
write_readme models entities "Gstr2bBundle, doc/cp/summary row types."

for type in feature ui models utils shared data-access; do
  for dir in "$ROOT/libs/gstr2b/${type}"/*/; do
    [[ -f "${dir}README.md" ]] || write_readme "$type" "$(basename "$dir")" "See domain README."
  done
done

echo "gstr2b README stubs written"
