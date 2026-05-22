#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

gen_angular() {
  node scripts/generate-lib.js angular gstr1a feature "$1" domain=gstr1a type=feature
}

gen_js() {
  local layer="$1"
  local name="$2"
  node scripts/generate-lib.js js gstr1a "$layer" "$name" domain=gstr1a "type:${layer}" --no-buildable 2>/dev/null || \
  node scripts/generate-lib.js js gstr1a "$layer" "$name" domain=gstr1a "type:${layer}"
}

# data-access (js)
for name in api services stores facades guards state interceptors resolvers; do
  node scripts/generate-lib.js js gstr1a data-access "$name" domain=gstr1a type=data-access
done

# models (js)
for name in requests responses entities dto enums interfaces; do
  node scripts/generate-lib.js js gstr1a models "$name" domain=gstr1a type=models
done

# utils (js)
for name in amendment-calculators transformers validators constants mappers diff-utils helpers; do
  node scripts/generate-lib.js js gstr1a utils "$name" domain=gstr1a type=utils
done

# shared (js)
for name in session return-period amendment-engine caching filters pagination error-handler; do
  node scripts/generate-lib.js js gstr1a shared "$name" domain=gstr1a type=shared
done

# ui (angular - minimal)
for name in amendment-table invoice-comparison amendment-summary-cards change-highlighter filters loaders filing-status empty-state shared; do
  node scripts/generate-lib.js angular gstr1a ui "$name" domain=gstr1a type=ui
done

# feature (angular)
for name in dashboard amendment-summary shared b2b b2cl b2cs exp cdnr cdnur at nil hsn \
  b2ba b2cla b2csa expa cdnra cdnura ata txpa txpda atadja ecoma supecoa \
  nil-amendments hsn-amendments docs-amendments filing; do
  node scripts/generate-lib.js angular gstr1a feature "$name" domain=gstr1a type=feature
done

echo "GSTR-1A scaffold complete."
