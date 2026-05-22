#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
TAG="type:TYPE,domain:gstr2a"

gen_angular() {
  local type="$1" name="$2"
  local tags="${TAG//TYPE/$type}"
  node scripts/generate-lib.js angular gstr2a "$type" "$name" "$tags"
}

gen_js() {
  local type="$1" name="$2"
  local tags="${TAG//TYPE/$type}"
  node scripts/generate-lib.js js gstr2a "$type" "$name" "$tags" true
}

# feature (13)
for n in dashboard summary b2b b2ba cdn cdna isd isda impg impgsez ecom ecoma shared; do
  gen_angular feature "$n"
done

# data-access (7)
for n in services stores facades api interceptors guards state; do
  gen_angular data-access "$n"
done

# ui (6)
for n in summary-cards invoice-table filters loaders empty-state shared; do
  gen_angular ui "$n"
done

# models (5)
for n in requests responses entities enums interfaces; do
  gen_js models "$n"
done

# utils (5)
for n in helpers transformers constants mappers validators; do
  gen_js utils "$n"
done

# shared cross-cutting (6)
for n in session return-period pagination filters caching error-handler; do
  gen_js shared "$n"
done

# extra routes for migration
for n in tds-tcs cdn-notes cdn-note-detail; do
  gen_angular feature "$n"
done

echo "Done: gstr2a libs generated"
