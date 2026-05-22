# Tax calculation

Moved verbatim from legacy `gstzen-auth` — **do not change formulas** without regression review.

## Core helpers (`utils/calculators`)

| Function | Role |
|----------|------|
| `numGstr3b` | Safe numeric parse |
| `withComputedItcNet` | ITC net rows before retsave |
| `buildGstr3bRetsavePayload` | Merge `Gstr3bRetsaveFormState` → API body |
| `emptyGstr3bRetsaveFormState` | Default form |
| `buildGstr3bPaymentGrid` | Table 6.1 payment grid (`gstr3b-tx-pmt`) |

## Mappers (`utils/mappers`)

| Function | Role |
|----------|------|
| `parseGstr3bRetsaveFromRetsum` | Primary load |
| `parseGstr3bAutoliabBundle` | Summary tables |
| `parseGstr3bRetsaveFromAutoliab` | Fallback form (calculators) |

## Payment liability

`gstr3bHasPendingTaxLiability` — used on payment page before confirm.
