#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

write_readme() {
  local type="$1" name="$2" purpose="$3"
  cat > "$ROOT/libs/gstr3b/${type}/${name}/README.md" <<EOF
# gstr3b / ${type} / ${name}

${purpose}

Import: \`@ramsoft-builder/gstr3b/${type}/${name}\`

See [libs/gstr3b/README.md](../../README.md).
EOF
}

write_readme feature summary "GSTR-3B summary dashboard (tables 3.1–6.1)."
write_readme feature outward-supplies "Outward taxable supplies editor (reference section)."
write_readme data-access api "GST API client (autoliab, retsum, retsave)."
write_readme data-access stores "Workspace and section signal stores."
write_readme data-access facades "Workspace and section facades."
write_readme utils calculators "Tax/ITC/retsave calculators."
write_readme utils mappers "Payload parsers (autoliab, retsum)."
write_readme shared tax-calculation "Pure tax calculation helpers (README anchor)."

for type in feature ui models utils shared data-access; do
  for dir in "$ROOT/libs/gstr3b/${type}"/*/; do
    [[ -f "${dir}README.md" ]] || write_readme "$type" "$(basename "$dir")" "See domain README."
  done
done

echo "gstr3b README stubs written"
