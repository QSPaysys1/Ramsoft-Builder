#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
TAG="type:TYPE,domain:gstr3b"

gen_angular() {
  node scripts/generate-lib.js angular gstr3b "$1" "$2" "${TAG//TYPE/$1}"
}

gen_js() {
  node scripts/generate-lib.js js gstr3b "$1" "$2" "${TAG//TYPE/$1}" true
}

for n in dashboard outward-supplies inward-supplies itc exempt-nil-non-gst interest-late-fee payment-tax tds-tcs-credit refund-adjustment summary filing shared; do
  gen_angular feature "$n"
done

for n in services stores facades api interceptors guards state resolvers; do
  gen_angular data-access "$n"
done

for n in summary-cards tax-table payment-table itc-table filing-status loaders filters empty-state shared; do
  gen_angular ui "$n"
done

for n in requests responses entities dto enums interfaces; do
  gen_js models "$n"
done

for n in calculators transformers validators constants mappers helpers; do
  gen_js utils "$n"
done

for n in session return-period tax-calculation caching filters pagination error-handler; do
  gen_js shared "$n"
done

echo "Done: gstr3b libs generated"
