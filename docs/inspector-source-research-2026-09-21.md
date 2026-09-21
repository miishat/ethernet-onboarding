# 400G frame inspector source research

Research date: 2026-09-21

Target profile: `400gbase-dr4-tx-v1`, IEEE Std 802.3-2022

## Outcome

The public IEEE endpoints tested did not expose readable final IEEE Std 802.3-2022 algorithm text. The IEEE Xplore document endpoint returned publication metadata but no readable standard, and its PDF endpoint returned HTTP 418. The final IEEE 802.3bs publication page offers purchase or subscription access.

The research found one narrow implementation-safe exception. ITU-T G.709.5 (2024) Corrigendum 1, Annex A, identifies its RS(544,514) code as the code used by IEEE 802.3 100GBASE-R, 200GBASE-R, 400GBASE-R, and 800GBASE-R. It specifies the field polynomial, generator roots, systematic ordering, and symbol conventions needed for a standalone RS primitive. It does not establish the Ethernet PCS input mapping, codeword interleave, PCS lane distribution, PMA mapping, or PAM4 behavior.

Therefore the complete 400GBASE-DR4 profile remains verification-blocked. A standalone RS arithmetic module may proceed only as an isolated primitive and must not make `getProfileSupport("400G", "tx", "100")` return true.

## Source ledger

| ID | Source | Status | Safe use |
|---|---|---|---|
| S1 | [IEEE Std 802.3-2022 publication record](https://ieeexplore.ieee.org/document/9844436), 29 July 2022 | Final metadata; normative text inaccessible | Confirms selected edition only |
| S2 | [IEEE 802.3bs-2017 publication record](https://standards.ieee.org/ieee/802.3bs/6748/), approved 6 December 2017 | Final metadata; full text gated | Confirms amendment status and clauses added |
| S3 | [P802.3bs/D1.4 marked-up Clause 119](https://www.ieee802.org/3/bs/public/16_05/ofelt_3bs_03_0516.pdf), 7 April 2016 | Unapproved draft | Research locator only; not production constants or expected output |
| S4 | [P802.3bs D1.1 review comments](https://www.ieee802.org/3/bs/comments/P802d3bs_D1p1_comments_prop_Cl.pdf), 12 January 2016 | Draft commentary | Shows relevant FEC conventions changed during drafting |
| S5 | [P802.3bs D3.2 sponsor comments](https://www.ieee802.org/3/bs/comments/P802d3bs_D3p2_comments_prop_Cl.pdf), 7 July 2017 | Draft commentary | Shows earlier alignment-marker details were not final |
| S6 | [802.3df D1.0 comment resolution](https://grouper.ieee.org/groups/802/3/df/public/22_12/brown_3df_03a_2212.pdf), 6 December 2022 | Draft contribution | Evidence that PMA multiplexing permits implementation choice; not an exact DR4 map |
| S7 | [IEEE machine-readable extracts](https://www.ieee802.org/3/publication/index.html), including Annex 172A inputs and codewords | Final IEEE-derived 800G extracts | Quarantined candidate for later RS-core validation only |
| S8 | [ITU-T G.709.5 (2024) Corrigendum 1](https://www.itu.int/rec/dologin_pub.asp?id=T-REC-G.709.5-202505-I%21Cor1%21PDF-E&lang=e&type=items), Annex A, pages 36-38 | Final normative ITU-T recommendation | Standalone GF(2^10) and systematic RS(544,514) arithmetic |
| S9 | [RFC 894](https://www.rfc-editor.org/info/rfc894/), April 1984 | Final IETF standard, contextual | Supports the 46-octet minimum data field for IP over Ethernet only |
| S10 | [IEEE maintenance request 1132](https://grouper.ieee.org/groups/802/3/maint/requests/maint_1132.pdf), 2026 | Draft maintenance request | CRC coverage locator only |
| S11 | [Ethernet Alliance 802.3bs PCS/PMA deep dive](https://ethernetalliance.org/blog/2018/03/28/a-deep-dive-into-the-802-3bs-200gbase-r-and-400gbase-r-pcspma/), 28 March 2018 | Secondary explanation | Geometry and conceptual examples only |

All sources were retrieved or rechecked on 2026-09-21.

## Evidence matrix

| Rule | Verdict | Consequence |
|---|---|---|
| MAC frame and FCS | Partially supported | Keep independently tested teaching-frame implementation; do not present it as certification of the complete 2022 profile |
| CDMII placement | Partially supported | Do not certify a finite CDMII stream |
| 64B/66B control tables | Partially supported | Wait for final Clause 82/117/119 tables and fixtures |
| 256B/257B transcode | Partially supported | Draft prototype only if separately labeled and opt-in |
| Bit serialization | Partially supported | Final confirmation still required at every boundary |
| Scrambler | Partially supported | Polynomial alone is insufficient for recurrence and initial-state behavior |
| Alignment-marker values and status | Partially supported | Do not freeze draft marker constants |
| Alignment-marker schedule and idle compensation | Partially supported | Do not execute phase defaults or add uncompensated overhead |
| Pre-FEC distribution | Partially supported | Do not feed a final-profile run |
| RS field, roots, and systematic parity | Unblocked in isolation | Implement a standalone RS primitive sourced to S8 |
| Codeword interleave and PCS lanes | Partially supported | Remove the assumed round-robin interleave; final 119.2.4.7 is required |
| DR4 PMA 16-to-4 mapping | Blocked | Require an implementation-specific `PmaMappingProfile` or end at PCS lanes |
| PAM4 labels and precoding | Blocked | Require a selected PMA contract with dibit, level, and precoder state |
| Independent end-to-end vectors | Partially supported | 800G extracts remain quarantined; no 400G end-to-end oracle was found |

Totals: 1 unblocked, 11 partially supported, 2 blocked.

## Materials still required

1. Lawful readable IEEE Std 802.3-2022 extracts for Clauses 3, 4, 117, 119, 120.5.2, and 124, plus Annex 119A.
2. A selected PMA implementation contract defining 16 PCS lanes to four PMD lanes, unit width, ordering, PAM4 labels, precoding mode, and initial state.
3. At least one independently generated 400G TX fixture containing every intermediate boundary and a reproducible source/revision/hash.
4. A product decision on whether the physical stage is an implementation-specific illustration or must claim a standard-defined DR4 signal.

## Task guidance

- Tasks 6 and 7 remain blocked for the final profile.
- Task 8 is split into 8a, standalone RS arithmetic, and 8b, Ethernet pre-FEC/interleave/PCS distribution. Only 8a may proceed now.
- Task 9 remains blocked until a `PmaMappingProfile` is selected.
- Task 10 remains blocked because the full chain and independent fixture are unavailable.
