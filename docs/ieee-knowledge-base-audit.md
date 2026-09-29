# IEEE knowledge base audit

Audit date: 2026-09-23; source-file updates: 2026-09-26 and 2026-09-28 (two passes). The
first pass checked the 54 PDFs pulled from `main` against the lesson content in
`src/data/stack.ts`, the frame stepper, and `research-brief.md`. The
2026-09-28 pass re-checked the claims that were blocked on missing sources
against the 15 PDFs added that day (83 PDFs in total).
PDF page numbers below are the printed IEEE page numbers, not viewer indices.

## Corrections made

| Finding | Evidence | Change |
|---|---|---|
| 1.6T PCS lane and codeword counts were called unconfirmed. | P802.3dj/D3.2 Clause 175.1.4 (p. 290) specifies **16 PCS lanes at 106.25 Gb/s**. Clause 175.2.4.7–.9 (p. 301) specifies **four RS(544,514) codewords**, interleaved on a 10-bit basis across those lanes. | Updated PCS lesson, stepper, and research brief. Kept the draft badge. |
| 800G PCS lane count was presented as an inference. | P802.3dj/D3.2 Clause 172.1.4 (p. 261) explicitly gives **32 PCS lanes at 26.5625 Gb/s**. | Removed the inference badge. |
| The 1.6T alignment marker interval was called unknown. | P802.3dj/D3.2 Clause 175.2.4.6.2 (p. 298) specifies **655,360 × 257-bit blocks**, equivalent to 32,768 codewords, across both flows; each flow has 327,680 blocks. | Updated the marker lesson. |
| The RS clause map listed Clause 118 for 800G and Clause 174 for 1.6T. | IEEE 802.3-2022 Clause 117 is the 200/400G RS. P802.3dj/D3.2 Clause 172.1.3 and Clause 175.1.4.1 point to **Clause 170** for the 800GMII and 1.6TMII. Clause 174 is an introduction to 1.6T networks. | Corrected RS labels to 117 and 170. For 400G fault signaling, Clause 117.3 invokes the Clause 81 state diagram. |
| The research brief called Annex 176A electrical link training. | P802.3dj/D3.2 Annex 176A (p. 772) is **SM-PMA test vectors**. Annex 178B (p. 874) defines ILT, RTS and autonomous path startup. | Corrected the brief. The app already points to Annex 178B. |
| Clause 122 PMD membership was marked tentative in the brief. | IEEE 802.3-2022 Clause 122 (p. 4934) names 200GBASE-FR4/LR4/ER4 and 400GBASE-FR8/LR8/ER8 in its title. | Confirmed; no app change needed. |

The P802.3dj excerpts are marked **unapproved draft D3.2, 29 July 2026**. Their
technical claims should keep a draft qualifier. These excerpts alone do not
establish the amendment's current approval or publication status.

## Source-file update (2026-09-26)

- Added the published IEEE 802.3df-2024 baseline excerpts for Clauses **169–173**
  and Annexes **172A** and **173A**. These seven PDFs were already present in the
  `interactive-frame-inspector` worktree; the copies in `knowledge_base_ieee/`
  match them byte for byte.
- Split the mixed `8023ck-2022-189-279-Annex-162A_compressed.pdf` into eight
  files: Clause 163, a Clause 167 amendment, Annex 93A and 120A amendments,
  full Annexes 120F and 120G, an Annex 135A amendment, and Annex 162A.
  The eight outputs reproduce all 91 pages in order. Annex 120F was already
  present in that mixed file, so it is not a missing source.
- Renamed the 802.3df Clause 167 PDF to
  `IEEE-802.3df-2024-Clause-167-amendment.pdf` to identify it as amendment text.
- Renamed the P802.3dj/D3.2 Clause 172, Clause 173, and Annex 4A excerpts
  with `-amendment` in their filenames. They change existing IEEE 802.3df
  or IEEE 802.3-2022 text rather than supplying complete base clauses.
- Standardized all 68 PDF filenames to `IEEE-<standard>-<edition>-<section>.pdf`
  or `IEEE-P802.3dj-D3.2-2026-<section>.pdf`, with `-amendment` for
  change-only excerpts. Removed page ranges and `_compressed` from filenames;
  page references should use the printed numbers within each PDF.

## Source-file update (2026-09-28)

Added 15 PDFs in two batches, named by reading each excerpt's contents, not the page range in
its original filename. The six complete clauses were checked to run through
their PICS Management tables. For change-only excerpts, the last editing
instruction was checked to be carried out on the page.

| File | Printed pages | Contents |
|---|---|---|
| `IEEE-802.3-2022-Clause-118.pdf` | 4823–4834 | Complete: 200GMII/400GMII Extender, 200GXS/400GXS |
| `IEEE-802.3db-2022-Clause-167.pdf` | 40–71 | Complete base clause ("Insert Clause 167"): 100G/200G/400G SR and VR |
| `IEEE-802.3df-2024-Clause-124-amendment.pdf` | 93–119 | Changes adding 400GBASE-DR4-2, 800GBASE-DR8 and 800GBASE-DR8-2 to Clause 124 |
| `IEEE-802.3df-2024-Clause-162-amendment.pdf` | 120–133 | Changes adding 800GBASE-CR8 to Clause 162 |
| `IEEE-802.3df-2024-Clause-163-amendment.pdf` | 134–141 | Changes adding 800GBASE-KR8 to Clause 163 |
| `IEEE-P802.3dj-D3.2-2026-Annex-73A-amendment.pdf` | 726–727 | Changes to Table 73A–1 and new 73A.1a (Message code 2) |
| `IEEE-P802.3dj-D3.2-2026-Clause-45-amendment.pdf` | 76–141 | Clause 45 MDIO register changes, ending at 45.2.7.13b |
| `IEEE-P802.3dj-D3.2-2026-Clause-73-amendment.pdf` | 146–163 | Clause 73 changes through the PICS |
| `IEEE-P802.3dj-D3.2-2026-Clause-90-amendment.pdf` | 164 | One change: adds the 800GMII and 1.6TMII to the TSSI list in 90.1 |
| `IEEE-P802.3dj-D3.2-2026-Clause-170-amendment.pdf` | 223–228 | Clause 170 changes adding the 1.6TMII; base text is the 802.3df-2024 Clause 170 |
| `IEEE-P802.3dj-D3.2-2026-Clause-178.pdf` | 386–416 | Complete: 200GBASE-KR1, 400GBASE-KR2, 800GBASE-KR4, 1.6TBASE-KR8 |
| `IEEE-P802.3dj-D3.2-2026-Clause-184.pdf` | 595–620 | Complete: 800GBASE-LR1 Inner FEC |
| `IEEE-P802.3dj-D3.2-2026-Clause-185.pdf` | 621–645 | Complete: 800GBASE-LR1 PMD (DP-16QAM coherent) |
| `IEEE-P802.3dj-D3.2-2026-Clause-186.pdf` | 646–699 | Complete: 800GBASE-ER1 FEC and PMA |
| `IEEE-P802.3dj-D3.2-2026-Clause-187.pdf` | 700–722 | Complete: 800GBASE-ER1-20 and 800GBASE-ER1 PMDs |

## Verification against the new sources (2026-09-28)

Each claim below was read against the source text. No app content was changed
in this pass.

| App claim (`src/data/stack.ts`) | Evidence | Result |
|---|---|---|
| 800G and 1.6T RS route to Clause 170; the 1.6T interface is the 1.6TMII; Local/Remote Fault signalling applies. | 802.3df-2024 Clause 170 defines the RS fault state machine by reference to Figure 81–11. The P802.3dj/D3.2 amendment extends Clause 170 to the 1.6TMII (170.1–170.3, p. 223–228) and keeps RS link-fault reporting. It also adds a 1.6T delay limit of **393,216 bit times (245.76 ns)** in Table 170–1 (p. 225). | Confirmed. Keep the draft badge on 1.6T. |
| 800G CR8/KR8 route to Clauses 162/163; 200G/lane CR and KR route to 179 and 178. | The 802.3df-2024 changes retitle Clause 162 to include **800GBASE-CR8** and Clause 163 to include **800GBASE-KR8** (p. 120, 134). The Clause 178 title names 200GBASE-KR1, 400GBASE-KR2, 800GBASE-KR4 and 1.6TBASE-KR8. Clause 179 names the matching CR1–CR8 types. | Confirmed. |
| KR lanes run at 106.25 GBd; 53.125 GHz is the Nyquist frequency. | Clause 178 gives **106.25 GBd** per lane (p. 390). | Confirmed. |
| KR backplane loss "at most 40 dB at 53.125 GHz" is an objective, not a complete compliance test. | Clause 178.10.2 (p. 409) gives **40 dB at 53.125 GHz as the *recommended* maximum ILdd from TP0d to TP5d**. The required channel checks are minimum COM (178.10.1, p. 406, computed per Annex 178A), ERL and the other Table 178–13 limits. Two transmitter and receiver classes (A/B) apply. | Consistent with the app's framing. Optional refinement: say D3.2 carries 40 dB as a recommended channel limit and makes COM the requirement. |
| SR4/VR4 use 53.125 GBd PAM4; SR reaches 100 m and VR 50 m on OM4/OM5; on OM3, SR reaches 60 m and VR 30 m. | 802.3db-2022 Clause 167 gives **53.125 GBd** (p. 43). Table 167–6 (p. 49) gives SR 0.5–100 m on OM4/OM5 and 0.5–60 m on OM3; VR 0.5–50 m on OM4/OM5 and 0.5–30 m on OM3. | Confirmed. |
| EMB at 850 nm: OM3 2000, OM4/OM5 4700 MHz·km. | Clause 167 fibre characteristics (p. 52). | Confirmed. |
| 800GBASE-SR8/VR8 are Clause 167 via 802.3df-2024; 400GBASE-SR8 is Clause 138 with nominal 50G lanes. | The 802.3df-2024 change to Clause 167 adds **800GBASE-VR8 and SR8** to its title. Clause 138 names 400GBASE-SR8 at **26.5625 GBd** (p. 5367). | Confirmed. |
| 802.3df-2024 800G types include DR8, DR8-2, SR8, VR8, CR8 and KR8. | 802.3df-2024 Clause 169 (p. 163) routes KR8→163, CR8→162, VR8/SR8→167, and **DR8/DR8-2→Clause 124**. | Confirmed. The 802.3df-2024 Clause 124 changes carry the DR8/DR8-2 PMD text. |
| Longer-reach 800G types: LR4, LR1, ER1-20, ER1; 2 km FR4. | Clause 183 names 800GBASE-FR4 and LR4 (p. 565). Clauses 184/185 define LR1, with a reach of "at least 10 km" (p. 621). Clauses 186/187 define ER1-20 and ER1. | Confirmed. The app lists names only; it makes no LR1/ER1 reach claims to check. |
| Clause 124 was extended to 400GBASE-DR4-2. | The 802.3df-2024 changes retitle Clause 124 to **400GBASE-DR4, 400GBASE-DR4-2, 800GBASE-DR8 and 800GBASE-DR8-2** (p. 93). | Confirmed. |
| P802.3dj extends autonegotiation with Message code 2 Next Pages carrying extended technology and FEC abilities. | The P802.3dj Clause 73 changes spread technology abilities over the Base Page and a **Message code 2 Next Page**. That page must be the first Next Page sent (p. 147–148). Priority resolution includes the Extended Technology Ability Field (p. 156). Clause 45.2.7.13b (p. 141) maps the 32-bit field to registers 7.54/7.55. P802.3dj 73A.1a (p. 726) names Message code 2 the **Extended FEC and Technology Ability Message**: EA0:EA25 technology bits map to D16:D41, EH0:EH1 CR host class bits to D42:D43, and EF0:EF3 extended FEC bits to D44:D47. | Confirmed. |
| Clause 90.7 reports maximum and minimum path data delay. | IEEE 802.3-2022 90.7 (p. 3677) defines the transmit/receive path data delay registers. P802.3dj adds the 1.6TMII to the TSSI list (90.1, p. 164). | Confirmed. |
| 200/400G SR4/VR4 may use the Clause 118 extender. | Table 167–2 (p. 41) lists the 200GMII/400GMII Extender (Clause 118) as optional. | Confirmed. The app does not cite Clause 118; it is supporting context. |

## Clauses and annexes to add

Priority describes the current app's dependence on the text, not a request to
collect every clause in IEEE 802.3. The 2026-09-28 additions resolved the
earlier entries for Clauses 118, 167 (base), 170 and 178, Clauses 184–187, the
45/73/90/162/163 amendments, the 802.3df-2024 Clause 124 amendment and the
P802.3dj Annex 73A changes. The IEEE Std 802.3-2022 sources below are still
needed to verify the complete 400GBASE-DR4 transmit calculation; the presence
of Clauses 81, 117, 119, 120 and 124 does not close those gaps.

| Priority | Missing source | Why it matters |
|---|---|---|
| High | **IEEE Std 802.3-2022 Clause 49, especially 49.2.6** | Verify the self-synchronous scrambler recurrence, bit direction and predecessor-state convention used by the 400G TX inspector. |
| High | **IEEE Std 802.3-2022 Clause 82, including the 64B/66B control tables and control-character rules** | Verify Start, Terminate, Idle and mixed control/data encoding, plus which control inputs may be removed for alignment-marker rate matching. |
| High | **IEEE Std 802.3-2022 Annex 119A, including its 400G transmit example tables** | Check the complete PCS/FEC stream against a published example with defined initial state, input/output orientation and expected values. |
| Low | **P802.3dj/D3.2 pp. 142–145, 165–222 and 229–260** | These pages sit between the D3.2 excerpts: after Clause 45 (ends p. 141), after the Clause 90 change (p. 164) and after Clause 170 (ends p. 228). Their contents were not examined. Check the draft's contents list for changes to clauses the app cites, such as 116–120 or 169. Clause 171, which 170.1.2 cites for the 1.6TMII Extender, probably falls in 229–260. The app does not cite Clause 171. |
| External to 802.3 | **IEEE 802.1Q, 802.1AE and applicable form-factor/MSA sources** | PFC, MACsec and module claims cannot be verified from the IEEE 802.3 PDFs. Keep those explicitly outside the 802.3 source coverage. |

## Filing and scope notes

- The mixed 802.3ck file and the 802.3df Clause 167 file have been split or
  renamed as recorded above. The complete base Clause 167 is now present as
  `IEEE-802.3db-2022-Clause-167.pdf`. Read it with the 802.3ck and 802.3df
  Clause 167 amendments.
- Read the P802.3dj Clause 170 amendment with `IEEE-802.3df-2024-Clause-170.pdf`,
  and the 802.3df Clause 162/163 amendments with the 802.3ck-2022 base clauses.
- Read the P802.3dj Annex 73A changes with the IEEE 802.3-2022 base Annex 73A,
  which is not in the KB; the app's Message code 2 claim relies only on the new
  73A.1a text.
- The P802.3dj Clause 90 excerpt covers only the 90.1 change. It does not show
  that the draft makes no other Clause 90 changes.
- The 802.3dj D3.2 files are draft excerpts. Keep version labels with findings
  because later revisions could change requirements.
- These passes checked the central numerical claims and clause routing listed
  above. They are not a line-by-line conformance review of every optical table,
  quiz or diagram.
