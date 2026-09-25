# IEEE Std 802.3-2022 line-check register

Status: **partially admitted** as of 2026-09-23.

This register is the admission path for IEEE-derived rules used by
`400gbase-dr4-tx-v1`. It records concise implementation facts only. Final
IEEE text is not reproduced here.

## Local access evidence

The following user-provided local extracts were reviewed on 2026-09-23. Page
numbers are printed PDF pages, not viewer indices. Clauses 49 and 82, and
Annex 119A, are absent from `knowledge_base_ieee` and remain blocked.

| Local filename | Clauses admitted from the extract |
| --- | --- |
| `8023-2022-4817-4823-Clause-117_compressed.pdf` | 117.1-117.3; 117.5.4.2-117.5.4.3 |
| `8023-2022-4836-4874-Clause-119_compressed.pdf` | 119.2.4.1-119.2.4.7 |
| `8023-2022-4875-4904-Clause-120_compressed.pdf` | 120.1.3-120.1.4; 120.5.2 |
| `8023-2022-4988-5009-Clause-124_compressed.pdf` | 124.1; Table 124-1 |

## Rule register

| Rule ID | Clause and printed page | Local filename | Access path and date | Concise implementation convention | Status |
| --- | --- | --- | --- | --- | --- |
| `scrambler-recurrence` | 49.2.6, unavailable | unavailable | unavailable | The recurrence is not admitted. | blocked |
| `encode66-control-tables` | 82, unavailable | unavailable | unavailable | Control definitions are not admitted. | blocked |
| `rs-cdmii-placement` | 117.1-117.3, pp. 4816-4818; 117.5.4.2-117.5.4.3, pp. 4820-4821 | `8023-2022-4817-4823-Clause-117_compressed.pdf` | user-provided local copy, 2026-09-23 | 400GMII has independent 64-bit paths; TXD/TXC proceed from lane 0 through lane 63; Start is lane 0 and Terminate can occupy any lane. Full stream rules still defer to unavailable Clauses 81 and 82. | blocked |
| `pcs-transmit-flow` | 119.2.4.1, p. 4840 | `8023-2022-4836-4874-Clause-119_compressed.pdf` | user-provided local copy, 2026-09-23 | Encode 66-bit blocks, transcode, and remove eligible control characters or ordered sets when rate matching is needed for AM insertion. | verified |
| `transcode257-order` | 119.2.4.2, pp. 4841-4842; Figure 119-3 | `8023-2022-4836-4874-Clause-119_compressed.pdf` | user-provided local copy, 2026-09-23 | Four inputs are ordered oldest to newest, with j=3 newest; the 257-bit result and constituent fields serialize bit 0 first. | verified |
| `scrambler-application` | 119.2.4.3, p. 4842 | `8023-2022-4836-4874-Clause-119_compressed.pdf` | user-provided local copy, 2026-09-23 | Scramble each complete transcoded 257-bit block after transcoding. The Clause 49 recurrence remains blocked. | verified |
| `am-values-status-pad` | 119.2.4.4.2, pp. 4846-4848; Table 119-2; Figure 119-8 | `8023-2022-4836-4874-Clause-119_compressed.pdf` | user-provided local copy, 2026-09-23 | A 400G AM group is 2056 bits (8 x 257), has 16 120-bit lane markers, a 133-bit PRBS9 pad, and 3 status bits. It begins a two-message FEC pair and recurs every 163840 transcoded blocks. | verified |
| `pre-fec-distribution` | 119.2.4.5, p. 4848 | `8023-2022-4836-4874-Clause-119_compressed.pdf` | user-provided local copy, 2026-09-23 | A 10280-bit, 40-block FEC pair becomes two 514-symbol messages by the specified 10-bit round-robin equations. | verified |
| `rs-codeword-orientation` | 119.2.4.6, pp. 4848-4849; Table 119-3 | `8023-2022-4836-4874-Clause-119_compressed.pdf` | user-provided local copy, 2026-09-23 | Use RS(544,514) over GF(2^10); the first encoder input is m[k-1], and temporal codeword order starts c[n-1]. | verified |
| `codeword-interleave` | 119.2.4.7, p. 4850 | `8023-2022-4836-4874-Clause-119_compressed.pdf` | user-provided local copy, 2026-09-23 | For k=0..67 and j=0..7, alternate A/B ownership by k parity, distribute low PCS lane to high, and serialize each symbol bit 0 first. | verified |
| `pma-16-to-4` | 120.1.3-120.1.4, pp. 4874-4876; 120.5.2, pp. 4881-4882 | `8023-2022-4875-4904-Clause-120_compressed.pdf` | user-provided local copy, 2026-09-23 | 400G uses 16 PCSLs. An implementation may choose any allowable PCSL order if it preserves that choice, so a `PmaMappingProfile` is still required. | verified |
| `dr4-scope` | 124.1 and Table 124-1, p. 4987 | `8023-2022-4988-5009-Clause-124_compressed.pdf` | user-provided local copy, 2026-09-23 | 400GBASE-DR4 is PAM4 and requires Clauses 119 and 120; 400GMII and Annex 120E are optional interfaces. | verified |
| `annex-119a-fixture` | Annex 119A, unavailable | unavailable | unavailable | No Annex row, source hash, state, or fixture is admitted. | blocked |

## Admission limits

Independent review by `/root/ieee_source_admission_review_light` accepted the
scoped local facts in commit `887f6c3` on 2026-09-23. It required two
bookkeeping corrections: correct the review provenance and stop tracking the
local SDD report. This is not full Task 1 admission.

The verified records do not enable `400gbase-dr4-tx-v1`. The missing Clause
49 recurrence, Clause 82 control rules, full Clause 117/81 stream chain, and
independently reviewed Annex 119A fixture keep the IEEE-only capability false.

An earlier Task 4 candidate reserved two blocks every 40 blocks and used a
514-bit local AM. The experimental implementation now uses the locally
reviewed eight-block, 2056-bit AM group every 163840 blocks, aligned to a
40-block FEC pair. Its Idle deletion policy is project-owned. Clause 82 input
legality has not been admitted, so this correction does not enable the
IEEE-only profile.
