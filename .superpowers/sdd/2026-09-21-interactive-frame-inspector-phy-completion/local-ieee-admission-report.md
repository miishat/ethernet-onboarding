# Local IEEE admission report

Date: 2026-09-23

## Admitted evidence

The user-provided final IEEE Std 802.3-2022 extracts admit scoped facts from
Clause 117, Clause 119, Clause 120, and Clause 124. The register records the
exact filename, clause, printed page, access path `user-provided local copy`,
and review date for each verified record.

Clause 119 now admits the 400G AM structure: 2056 bits or 8 x 257-bit blocks,
every 163840 transcoded blocks, beginning a 40-block FEC pair. The AM contains
16 x 120-bit lane markers, a 133-bit PRBS9 pad, and 3 status bits.

## Remaining blockers

Clause 49, Clause 82, and Annex 119A are absent from the local collection.
The scrambler recurrence, control rules, complete finite stream chain, Annex
source values, source hash, and independent fixture remain blocked.

The IEEE-only capability remains false. This admission does not claim final
PHY completion or standards conformance.

## Task 4 conflict

Task 4's candidate two-block/40-block reservation, `fecPairBlocks: 2`, and
514-bit local AM conflict with the admitted Clause 119 geometry. Any
standards-facing replacement must use the eight-block AM reservation, 163840
block cadence, and 40-block FEC pair. The exact removable inputs remain a
product policy constrained by unavailable Clause 82 legality rules.
