# API contracts

Every response the app reads is validated here before anything renders it. The
goal is not validation for its own sake — it is that a schema or precision
change from the provider **fails loudly with a diff you can act on**, instead of
quietly becoming a `$0.00` on someone's receipt.

## Layout

| File          | Purpose                                                         |
| ------------- | --------------------------------------------------------------- |
| `schema.js`   | The validator: field types, issue codes, and the diff formatter |
| `transfer.js` | `Transfer v1` — the record the transfers list and rows render   |
| `quote.js`    | `Quote v1` — the priced transfer shown before submission        |

Recorded payloads live in `test/fixtures/v<N>/`, with the ones that must be
rejected in `test/fixtures/v<N>/breaking/`.

## What counts as breaking

- **Additive** — a provider adds a field. Allowed and preserved, so a released
  client keeps working.
- **Breaking** — a declared field is missing, renamed, retyped, or carries a
  value outside its declared set. Rejected with a diff naming the field.

A snake_case rename is reported as `renamed_field` rather than as an unrelated
missing field, so the diff points at the actual change:

```
Transfer v1 contract mismatch from listTransfers[0] (1 issue):
  - sendAmount: expected field "sendAmount", received field "send_amount" carrying string "200.00"
      hint: "send_amount" looks like a renamed "sendAmount" — map it in the adapter or bump the contract version
  Fix: update the adapter for Transfer v1 and the matching fixtures in test/fixtures/v1/ together, or bump the contract version.
```

## Changing a contract

1. Decide whether the change is additive (no version bump) or breaking.
2. For a breaking change, add `test/fixtures/v<N+1>/`, keeping `v<N>` intact so
   the old shape stays covered while both are in flight.
3. Update the schema and the fixtures **in the same commit**. The contract tests
   fail if a declared status has no fixture, or if a breaking fixture has no
   recorded expectation, so neither half can be forgotten.

## Money

Amounts cross this boundary as canonical decimal _strings_ and are never
floats in between — see the header of `src/utils/money.js` for why. Render them
with `formatMoney`, not `formatAmount`.
