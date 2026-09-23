# 400G frame inspector source research

Research updated: 2026-09-23

Target profile: `400gbase-dr4-tx-v1`, IEEE Std 802.3-2022.

## Outcome

User-provided local final IEEE Std 802.3-2022 extracts now admit the scoped
Clause 117, 119, 120, and 124 facts recorded in
[the line-check register](inspector-ieee-line-check.md). Every admitted record
uses access path `user-provided local copy`, date 2026-09-23, its exact local
PDF filename, and printed page number.

This is partial evidence, not completion of the PHY profile. The local set has
no Clause 49, Clause 82, or Annex 119A extract. The scrambler recurrence,
control definitions, complete finite stream chain, and independent Annex
fixture remain blocked. `getProfileSupport("400G", "tx", "100")` therefore
remains false.

Independent review by `/root/ieee_source_admission_review_light` accepted the
scoped facts in commit `887f6c3` on 2026-09-23, with two required bookkeeping
corrections. That acceptance does not complete Task 1 or change any IEEE gate.

## Final local source ledger

| ID | Final local source and scope | Status | Safe use |
| --- | --- | --- | --- |
| L117 | `8023-2022-4817-4823-Clause-117_compressed.pdf`, 117.1-117.3, pp. 4816-4818; 117.5.4.2-117.5.4.3, pp. 4820-4821 | Partial | 64-bit 400GMII paths, lane ordering, Start lane, and Terminate range. Clause 81/82 dependencies remain blocked. |
| L119 | `8023-2022-4836-4874-Clause-119_compressed.pdf`, 119.2.4.1-119.2.4.7, pp. 4840-4850 | Admitted where listed below | PCS flow, transcoder order, scrambler placement, AM geometry/cadence, FEC distribution, orientation, and lane interleave. |
| L120 | `8023-2022-4875-4904-Clause-120_compressed.pdf`, 120.1.3-120.1.4, pp. 4874-4876; 120.5.2, pp. 4881-4882 | Admitted | 16 PCSLs and the implementation-choice boundary for their ordering. |
| L124 | `8023-2022-4988-5009-Clause-124_compressed.pdf`, 124.1 and Table 124-1, p. 4987 | Admitted | DR4 is PAM4 and requires Clauses 119 and 120. |

All L-series entries were accessed as `user-provided local copy` on
2026-09-23. The existing draft, ITU-T, OIF, and public access records remain
context only. They neither replace nor expand the final local evidence.

## Consolidated rule status

| Rule | Final evidence | Status | Implementation consequence |
| --- | --- | --- | --- |
| CDMII placement | L117 | Blocked | The 64-bit path facts are admitted, but Clause 82 control semantics and full Clause 81 stream rules are missing. |
| 256B/257B | L119 119.2.4.2, pp. 4841-4842 | Verified | Four 66-bit inputs, j=3 newest, and bit 0 first output convention are admitted. Invalid-header handling still needs its specified final branch before a complete implementation claim. |
| Scrambler placement | L119 119.2.4.3, p. 4842 | Verified | Scramble full 257-bit outputs after transcoding. The Clause 49 recurrence is blocked. |
| AM construction | L119 119.2.4.4.2, pp. 4846-4848, Table 119-2, Figure 119-8 | Verified | 2056 bits: 8 x 257-bit blocks, 16 x 120-bit markers, 133-bit PRBS9 pad, and 3 status bits. |
| AM cadence and FEC boundary | L119 119.2.4.4.2 and 119.2.4.5, p. 4848 | Verified | Repeat every 163840 transcoded blocks. An AM starts a 40-block FEC pair that yields two 514-symbol messages. |
| FEC distribution and orientation | L119 119.2.4.5-119.2.4.6, pp. 4848-4849, Table 119-3 | Verified | Use the specified 10-bit distribution, RS(544,514), first encoder input m[k-1], and temporal c[n-1]-first order. |
| Interleave and PCS lanes | L119 119.2.4.7, p. 4850 | Verified | Checkerboard A/B ownership alternates by k parity across 16 PCS lanes; symbol bit 0 is first. |
| PMA order | L120 120.5.2, pp. 4881-4882 | Verified as implementation-specific | IEEE does not supply a universal 16:4 schedule. A selected `PmaMappingProfile` and its own fixture remain required. |
| DR4 scope | L124 124.1 and Table 124-1, p. 4987 | Verified | DR4 is PAM4 and requires Clauses 119 and 120. |
| Annex 119A fixture | unavailable | Blocked | Do not admit source rows, source hash, state, or expected fixture output. |

## Task 4 policy conflict

The current Task 4 candidate is not an IEEE representation. Its two reserved
257-bit blocks every 40 input blocks, `fecPairBlocks: 2`, and local 514-bit AM
conflict with final Clause 119. A standards-facing policy must instead use an
eight-block, 2056-bit AM group every 163840 257-bit blocks and retain the
40-block FEC-pair boundary. The standard permits rate matching by removing
eligible control characters or ordered sets, but the local extracts do not
provide Clause 82 legality. A deterministic product-owned `RateMatchPolicy`
is still required and cannot authorize deletion until that input legality is
available.

## Experimental reference ruling

`400gbase-dr4-tx-reference-pma-v1` remains metadata for a future
project-owned experimental pipeline. It must retain its candidate-source and
independent-fixture labels and cannot enable the IEEE-only profile. The 800G
machine-readable material remains quarantined evidence and is not an Annex
119A substitute.

## Unblock requirements

1. Obtain final local Clause 49, Clause 82, and Annex 119A sources.
2. Admit the recurrence and legal control inputs after line review.
3. Independently create, hash, and review a nonzero Annex 119A-derived 400G
   fixture with complete input, state, policy, and output provenance.
4. Select and fixture a product-owned PMA mapping and rate-match policy.

No candidate or partial result authorizes enabling `400gbase-dr4-tx-v1`.
