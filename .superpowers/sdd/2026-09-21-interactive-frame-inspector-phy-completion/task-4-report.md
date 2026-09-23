# Task 4 report: experimental scrambling, rate matching, and markers

## Status

Complete for `400gbase-dr4-tx-reference-pma-v1` only. The implementation is a
visibly experimental reference using candidate contracts. It is not IEEE
verified or standards conformant, and the IEEE-only profile remains disabled.

## Implemented reference policies

- `product-owned-self-synchronous-scrambler-v1` represents a 58-bit carried
  predecessor history, oldest to newest. Its candidate recurrence is
  `output = input xor history[19] xor history[0]`. The state is never reset
  at a block or window boundary.
- `product-owned-reference-am-values-v1` defines a local marker layout because
  the AM values, status, and PRBS conventions remain unverified. Each 514-bit
  reservation starts with fixed LSB-first `0xA55A`, followed by an LSB-first
  group identifier and a PRBS9 pad. PRBS output is `state[8]`; feedback is
  `state[8] xor state[4]`.
- `product-owned-reference-am-rate-match-v1` is a product-owned policy. It
  schedules two reserved 257-bit blocks every 40 input blocks, aligned to
  two-block FEC pairs, and removes earliest complete all-Idle CDMII words
  only. Each removal includes immutable original position and reservation
  provenance. Frame-bearing words are ineligible.

The candidate source locator on all generated results is
`ieee-bs-d14-cl119-locator` for IEEE P802.3bs/D1.4. It is not used as final
IEEE authority.

## Frozen local fixtures

`scramble-reference-policy-v1.json` contains a nonzero 58-bit predecessor
state and all 512 output bits of a deterministic input. The test also checks
one-shot and split-window output and state identity. `marker-reference-policy-v1.json`
records the AM and PRBS convention, starting PRBS state, reservation, cadence,
and pair alignment. Both are independent local reference-policy fixtures, not
admitted IEEE vectors.

## Validation

- Focused PCS and marker suite: 22 passing tests.
- Focused marker coverage command: 4 passing tests.
- TypeScript typecheck and whitespace diff check passed.

## Fix round 1

Each reserved 257-bit marker block now removes exactly four complete all-Idle
CDMII words. A two-block reservation therefore removes eight words. Selection
is performed per reservation in stable original-word order, records the exact
reservation mapping on every deletion, and rejects an eligible Idle that would
require deferral past `maximumDeferralBlocks`. The immutable ledger is carried
from `PreparedStream` through `MarkerPlan` and `MarkerResult`.

The AM fixture now freezes all 514 first-marker bits, including fixed common
and status fields, group field, PRBS9 pad, and carried PRBS state after one
and two inserted markers. The scrambler fixture is now accurately labeled a
frozen local product-policy fixture rather than an independent vector.
