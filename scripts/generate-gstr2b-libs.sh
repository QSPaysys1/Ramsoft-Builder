#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
TAG="type:TYPE,domain:gstr2b"

gen_angular() {
  node scripts/generate-lib.js angular gstr2b "$1" "$2" "${TAG//TYPE/$1}"
}

gen_js() {
  node scripts/generate-lib.js js gstr2b "$1" "$2" "${TAG//TYPE/$1}" true
}

for n in dashboard summary b2b b2ba cdn cdna isd isda impg impgsez ecom ecoma itc-summary reconciliation shared; do
  gen_angular feature "$n"
done

for n in services stores facades api interceptors guards state; do
  gen_angular data-access "$n"
done

for n in summary-cards invoice-table filters loaders reconciliation-table mismatch-view empty-state shared; do
  gen_angular ui "$n"
done

for n in requests responses entities enums interfaces; do
  gen_js models "$n"
done

for n in helpers transformers constants mappers validators; do
  gen_js utils "$n"
done

for n in session return-period pagination filters caching reconciliation error-handler; do
  gen_js shared "$n"
done

echo "Done: gstr2b libs generated"
