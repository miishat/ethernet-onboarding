# AM final alignment report

Date: 2026-09-23

## Scope

Aligned only the experimental reference alignment-marker and rate-match path
to the locally reviewed IEEE Std 802.3-2022 Clause 119 final text. The
IEEE-only capability remains false.

## Final-text evidence

The licensed local Clause 119 extract was rendered and reviewed at printed
pages 4846 through 4848. Table 119-2 provided all sixteen 120-bit lane-marker
octet values. The 400G mapping procedure on p. 4847 provided the alternating
10-bit lane-pair order. Page 4848 provided the 2056-bit group, eight-block
insertion, 40-block pre-FEC-pair boundary, and 163840-block repetition period.

## Applied behavior

- The experimental marker now serializes the final Table 119-2 values octet
  LSB first, uses the specified 10-bit interleave, appends 133 PRBS9 bits, and
  carries a product-owned zero three-bit status field.
- The accepted experimental schedule is fixed at 8 x 257-bit reservation
  blocks, every 163840 blocks, starting at block zero of a 40-block FEC pair.
- The product-owned all-Idle selection remains bounded and deterministic. It
  deletes 32 complete 64-bit words for one eight-block reservation and keeps
  its deep-frozen ledger.
- The frozen fixture is bound to a hash-checked documented manual derivation
  artifact. It is not presented as an independent implementation.

## Deliberate limits

Clause 49 scrambling recurrence, Clause 82 control legality, end-to-end
PHY_XS inputs and selected AM status behavior for this experimental profile,
and Annex 119A vectors are still unavailable locally. Clause 119 p. 4844 does
define `tx_am_sf` composition, while this implementation intentionally selects
the labeled product-owned zero status value. This work does not claim IEEE
verification or standards conformance.

## Verification

Focused tests cover the marker boundary, 40-block FEC-pair start, 163840-block
cadence, exact 2056-bit marker output, frozen PRBS state, deterministic
32-word deletion capacity, maximum deferral, selection order, and immutable
ledger. Type checking and the full repository test suite were run after the
change.

## Provenance follow-up

The fixture now references `marker-final-cl119-derivation-v1.json`, a separate
documented manual derivation artifact. It records the final-source filename,
SHA-256, edition, pages, table and figure, deterministic JSON canonicalization,
author self-check identity, and its non-independent review status. The focused
test checks both the frozen marker-bit SHA-256 and the artifact's canonical
SHA-256 before using the fixture as an expected value.
