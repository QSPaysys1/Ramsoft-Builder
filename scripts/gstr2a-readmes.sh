#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

write_readme() {
  local type="$1" name="$2" purpose="$3"
  local path="$ROOT/libs/gstr2a/${type}/${name}/README.md"
  cat > "$path" <<EOF
# gstr2a / ${type} / ${name}

${purpose}

## Import

\`@ramsoft-builder/gstr2a/${type}/${name}\`

## Dependencies

See [libs/gstr2a/README.md](../../README.md).
EOF
}

write_readme feature dashboard "Route shell, hub page, and gstr2aRoutes."
write_readme feature b2b "B2B section page (reference implementation)."
write_readme data-access api "GSTZen read API client and section API services."
write_readme data-access stores "Signal stores including section base and B2B."
write_readme data-access facades "Section facades orchestrating API and mappers."
write_readme data-access services "Session consumer and profile helpers."
write_readme data-access guards "Route guards wrapping GSTR-1 JWT guard."
write_readme data-access interceptors "JWT interceptors documented here; registered in app.config."
write_readme data-access state "Workspace context types."
write_readme ui invoice-table "Presentational invoice table."
write_readme models entities "Domain entities."
write_readme utils mappers "Payload parsers and CSV helpers."
write_readme shared error-handler "Error normalization helpers."
write_readme shared caching "Session cache key helpers."

for type in feature ui models utils shared; do
  for dir in "$ROOT/libs/gstr2a/${type}"/*/; do
    name=$(basename "$dir")
    if [[ ! -f "${dir}README.md" ]]; then
      write_readme "$type" "$name" "See libs/gstr2a/README.md."
    fi
  done
done

echo "gstr2a README files written."
