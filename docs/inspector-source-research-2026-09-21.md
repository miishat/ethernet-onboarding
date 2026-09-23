# 400G frame inspector source research

Research date: 2026-09-21

Target profile: `400gbase-dr4-tx-v1`, IEEE Std 802.3-2022

## Outcome

IEEE Xplore document 9844436 makes IEEE Std 802.3-2022 available through the IEEE Reading Room, but the Reading Room requires IEEE account sign-in. This research session was unauthenticated, so it did not inspect the final clause text. The IEEE 802.3bs publication page and ISO record confirm the final amendment and its scope, but neither public page exposes the needed algorithms.

The exact Clause 119 FEC-distribution, two-codeword interleave and PCS-lane formulas are preserved below as **high-confidence implementation-ready candidates**, with their published clause and Annex 119A locators. They originate from official IEEE draft material and are independently corroborated in part by final ITU-T sources. A lawful final IEEE Reading Room or licensed-copy line check is still required before they may enter the named final profile or supply accepted fixture outputs. Third-party mirrors of copyrighted final text are not production authority and are not cited as such here.

Final ITU-T G.709.5 (2024) Corrigendum 1 unblocks the existing isolated RS(544,514) primitive. It also independently confirms that IEEE 400G uses a 10-bit, non-round-robin two-codeword re-interleave and 16 logical lanes, while deliberately referring to IEEE 119.2.4.7 for the exact mapping. The complete 400GBASE-DR4 profile remains verification-blocked, and `getProfileSupport("400G", "tx", "100")` stays false.

## Experimental reference execution ruling

`400gbase-dr4-tx-reference-pma-v1` is metadata for a future separate
project-owned experimental reference pipeline. It has no executable runtime
support yet. When implemented, every result must visibly carry these labels:
`Experimental reference using
candidate contracts`, `Candidate IEEE source`, `Independent local fixture`,
and `Not IEEE verified or standards conformant`.

Its candidate-source set is `ieee-bs-d14-cl119-locator`,
`ieee-bs-dr4-geometry-context`, `itu-g7095-2024-cor1-rs544`,
`ieee-df-172a-rs-candidate`, and `ieee-df-172a-input-candidate`. The 800G
machine-readable extracts stay quarantined evidence for their stated scope.
They do not become 400G standards authority or a substitute Annex 119A
fixture.

After a future experimental runner is implemented, an experimental result may
be displayed for investigation, but an expected output cannot be admitted
until an independent local reference generates a nonzero fixture with its
complete input, state, candidate-source IDs, output hash, and reviewer record.
No production pipeline code is added by this ruling. The upgrade path is
unchanged: complete the blocked IEEE line-check register, replace each
candidate contract with the reviewed final clause record, independently review
the 400G fixture, and only then consider enabling `400gbase-dr4-tx-v1`.

## Source ledger

| ID | Source and exact location | Status | Safe use |
|---|---|---|---|
| S1 | [IEEE Std 802.3-2022](https://ieeexplore.ieee.org/document/9844436), 29 Jul 2022, IEEE Reading Room sign-in required | Final authority; unread in this session | Required line check for Clauses 49, 82, 117, 119, 120.5.2 and 124. |
| S2 | [IEEE 802.3bs-2017 publication record](https://standards.ieee.org/ieee/802.3bs/6748/), approved 6 Dec 2017, published 12 Dec 2017 | Final record, full text gated | Confirms that Clauses 116-124 and Annexes 119A-120E were added. |
| S3 | [ISO/IEC/IEEE 8802-3:2017/Amd 10:2019 record](https://www.iso.org/standard/76460.html), 14 Feb 2019 | Final record, full text not inspected | Independent publication identity only. |
| S4 | [P802.3bs/D1.4 marked-up Clause 119](https://www.ieee802.org/3/bs/public/16_05/ofelt_3bs_03_0516.pdf), 7 Apr 2016, printed pp. 94-114, 119.2.4.1-119.2.4.8, Tables 119-1-119-3, Figures 119-2-119-11 | Official but unapproved draft | High-confidence candidate formulas and investigation locator, pending S1 line check. |
| S5 | [P802.3bs/D3.1 excerpt](https://www.ieee802.org/3/bs/public/adhoc/logic/mar09_17/trowbridge_02_0317_logic.pdf), 30 Jan 2017, printed p. 151, 119.2.4.3-119.2.4.4 | Official but unapproved draft | High-confidence candidate for scrambler/AM order and geometry, pending S1 line check. |
| S6 | [P802.3df D1.0 comment resolution](https://www.ieee802.org/3/df/public/22_12/brown_3df_03c_2212.pdf), 6 Dec 2022, PDF p. 8, 120.5.2 discussion | Official but unapproved material | Constrains 16-PCSL geometry, bit multiplexing and the implementation-choice boundary. |
| S7 | [IEEE machine-readable extracts index](https://www.ieee802.org/3/publication/index.html), including 802.3df Annex 172A [inputs](https://www.ieee802.org/3/publication/df/Annex_172A_Table_172A-1_and_Table_172A-2.txt) and [codewords](https://www.ieee802.org/3/publication/df/Annex_172A_Table_172A-3_to_Table_172A-6.txt) | Final IEEE-derived 800G extracts | Quarantined RS-core cross-check only. Not a 400G fixture. |
| S8 | [ITU-T G.709.5 (2024) Corrigendum 1](https://www.itu.int/epublications/es/publication/itu-t-g-709-5-2024-cor-1-2025-05), May 2025, Annex A, 9.4, 13.5.1 and Table 13-3 | Final normative ITU-T text | GF(2^10), RS(544,514), non-round-robin IEEE interleave corroboration, 16-lane AM illustration and LSB-first warning. Exact IEEE mapping remains deferred to 119.2.4.7. |
| S9 | [IEEE 802.3 Working Group discussion](https://www.ieee802.org/3/email_dialog/msg00924.html), 14 Jun 2019 | Official explanatory archive, not normative text | Confirms that individual Idle deletion locations for AM capacity are implementation-owned. |
| S10 | [OIF-EEI-112G-RTLR 1.0](https://www.oiforum.com/wp-content/uploads/OIF-EEI-112G-RTLR-01.0.pdf), 2025, 1.3.2 p. 10; [CMIS 5.0](https://www.oiforum.com/wp-content/uploads/CMIS5p0_Third_Party_Spec.pdf), glossary p. 27 | Final OIF specifications | Conditional `precoder: none` and Gray-label conventions for a selected OIF/CMIS compatible implementation only. |
| S11 | [IEEE Xplore document 9844436](https://ieeexplore.ieee.org/document/9844436), unauthenticated header check on 2026-09-21 | Official access evidence only | The response did not expose normative text. The blocked register and manifest record the remaining lawful review work. |

## IEEE line-check artifacts

The blocked [IEEE line-check register](inspector-ieee-line-check.md) and
`test/fixtures/inspector/ieee-8023-2022-source-manifest.json` were prepared
without transcribing any final IEEE text. They hold one blocked record for
each required final clause and a separate source hash and interpreted-fixture
hash field for Annex 119A. They do not admit a source artifact or a fixture.

The only available unauthenticated Xplore evidence was an access-control
response, not a normative-text response. No account authentication, purchase,
or access circumvention was attempted. A reviewer with their own authorized
Reading Room or licensed-copy access must complete the records before any
candidate rule can become a profile constant.

## Consolidated evidence matrix

| Rule | Evidence and exact locator | Status | Implementation consequence |
|---|---|---|---|
| MAC frame/FCS | Existing independently tested MAC subset; final Clause 3/4 line check still absent | Partial | Keep it separate from the PHY profile. |
| CDMII and 64B/66B control blocks | S1 Clauses 117 and 82 required; S4 locates the PCS integration only | Blocked | Do not build a final finite stream from a MAC frame. |
| 256B/257B and scrambler | S4 119.2.4.2; S5 119.2.4.3; final Clause 49/119 check needed | Conditional candidate | Preserve bit-indexed candidate work behind a final line check and independent vector. |
| AM values, state and phase | S5 119.2.4.4; S8 9.4/13.5.1/Table 13-3 | Conditional candidate | AM layout/order is well located, but generator values, status, PRBS history and first phase need final confirmation. |
| AM rate matching | S9 says the standard leaves Idle removal placement to the implementation | Implementation-specific | Require `RateMatchPolicy`; no universal deletion trace exists. |
| Pre-FEC split | S4 119.2.4.5, printed p. 108-109: for `i=0..513`, candidate `mA[513-i]=tx[20i+9:20i]`, `mB[513-i]=tx[20i+19:20i+10]` | Conditional candidate | Requires S1 line check, a 10,280-bit boundary test and adapter orientation test. |
| RS field and standalone parity | S8 Annex A, pp. 36-38 | Unblocked in isolation | Existing RS primitive remains valid only for direct 514-symbol input. |
| Codeword orientation | S4 119.2.4.6/Figures 119-9 and 119-11, printed pp. 109-110 and 113-114: temporal order begins `c[543]` and parity is the temporal tail | Conditional candidate | Add an explicit adapter rather than changing the isolated RS array convention. |
| Post-FEC interleave and PCS lanes | S4 119.2.4.7, printed p. 111-114; S8 13.5.1/Annex A says IEEE mapping is 10-bit and non-round-robin | Conditional candidate | Candidate formula is below. It may be implemented only after S1 line check and independent vector admission. |
| Annex 119A verification locator | S2 identifies Annex 119A; S4 references its draft predecessor. Candidate final locator is Tables 119A-2, 119A-5 and 119A-6 for a constant-Idle, AM-bearing 400G example | Conditional candidate | Do not copy a mirrored annex or accept expected outputs until accessed through S1 or a licensed copy, hashed and independently regenerated. |
| 16-to-4 PMA mux | S6 120.5.2 discussion permits valid order choices | Implementation-specific | A unique IEEE-only ordered mapping does not exist. Require `PmaMappingProfile`. |
| PAM4 labels and precoding | S10 supports `00,01,11,10` ascending labels and `precoder: none` only for selected OIF RTLR scope | Conditional implementation contract | Do not generalize OIF/CMIS labels or no-precoding to every DR4 PMA. |
| Full end-to-end fixture | S7 is 800G only; no admitted 400G final fixture | Blocked | Require an independently generated, hashed 400G fixture including every boundary and selected policies. |

### Candidate Clause 119 formulas

These are not final-profile constants until S1 is checked, but their exact form is retained to make that check mechanical.

```text
For i = 0..513:
  mA[513-i] = tx_scrambled_am[20i+9:20i]
  mB[513-i] = tx_scrambled_am[20i+19:20i+10]

For k = 0..67 and j = 0..7:
  if k is even:
    out[16k+2j]   = cA[543-8k-j]
    out[16k+2j+1] = cB[543-8k-j]
  otherwise exchange cA and cB

pcsLane[lane][k] = out[16k+lane], lane = 0..15
```

The candidate batch is 40 257-bit blocks, or 10,280 bits, producing two 514-symbol messages and two 544-symbol codewords. Candidate Annex 119A material identifies the constant-Idle AM case with `S<0:57> = 0x24e6959d0fa5dbd`, `P<0:8> = 0x100`, `tx_am_sf<2:0> = 000`, source `tx_scrambled_am` in Table 119A-2, and codewords in Tables 119A-5 and 119A-6. Treat all of these as locators pending lawful final access, not copied fixture data.

## Required contracts and materials

1. Complete the S1 Reading Room or licensed-copy line check for Clauses 49, 82, 117, 119.2.4.1-119.2.4.7, 120.5.2, 124 and Annex 119A. Record edition, page, line and retrieval date.
2. Define a deterministic, serializable `RateMatchPolicy`: eligible Idle encodings; ordered selection and tie-breaker; maximum deferral; frame-boundary handling; and AM schedule. The schedule's unit is a transcoded 257-bit block and it must declare phase zero as absolute stream block 0 immediately before an AM reservation, verification-gated `cadenceBlocks` and reservation capacity, `fecPairBlocks`, and `nextReservation(b) = phaseZero + max(0, ceil((b - phaseZero) / cadenceBlocks)) * cadenceBlocks`. The policy must derive the ordered eligible input Idles needed for each reservation from that state, rather than reading prior deletion results. Each deletion must be a typed ledger entry with original word/octet/bit position and Idle encoding; selected policy ID and reason; and marker-reservation group, insertion offset, FEC-pair index and boundary context. Carry that ledger through `PreparedStream`, `MarkerPlan` and `MarkerResult`; derive any removed-Idle count only for display. It is implementation-owned even after the IEEE line check.
3. Define `PmaMappingProfile`: provenance and fixture hash; scope/boundary; 16:4 geometry; an ordered bit-level mux schedule for each PMD lane with `periodBits`, full source-PCSL schedule, initial phase and deterministic phase advance from an absolute output-bit index; boundary bit indexing; PMD/MDI/fiber maps; polarity-transform stage; dibit order/significance; complete PAM4 map/normalization; precoder mode/state/reset; and training/scrambler boundary. Preserve the absolute mux phase across chunks and windows.
4. Admit one independent nonzero 400G fixture only after it records MAC/CDMII input, 66b/257b outputs, preceding scrambler state, AM state/phase, complete rate-match ledger, FEC messages, codewords, PCS lanes, and any selected PMA/PAM4 trace including absolute mux phase.

## Task guidance

- Task 6 and Task 7 remain conditional. Research has reduced them to a final IEEE line check plus fixtures, but does not authorize final-profile calculations before that check.
- Task 8a remains complete. Task 8b is conditionally specified by the retained candidate formulas. After S1 confirmation, implement an orientation adapter and Annex 119A fixture before integrating it with upstream PCS stages.
- Task 9 remains blocked for an IEEE-only profile. It can proceed only against a selected and fully populated `PmaMappingProfile`; OIF/CMIS conventions must be explicitly scoped.
- Task 10 remains blocked until Tasks 6, 7 and 8b are final-line-checked, the `RateMatchPolicy` and any `PmaMappingProfile` are selected, and a full independent fixture is admitted.
