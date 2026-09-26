# IEEE knowledge base audit

Audit date: 2026-09-23; source-file update: 2026-09-26. Checked the 54 PDFs pulled from `main` against the lesson
content in `src/data/stack.ts`, the frame stepper, and `research-brief.md`.
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

## Clauses and annexes to add

Priority describes the current app's dependence on the text, not a request to
collect every clause in IEEE 802.3.

| Priority | Missing source | Why it matters |
|---|---|---|
| High | **P802.3dj/D3.2 Clause 170** | Needed to verify the 1.6T RS, 1.6TMII, fault and idle-alignment details directly. The current excerpts refer to it but do not include it. |
| High | **P802.3dj/D3.2 Clause 178** | The app describes KR backplane PHYs and Annexes 178A/B. Those annexes do not replace the parent PMD clause. |
| Medium | **IEEE 802.3db base Clause 167** | The folder has 802.3ck and 802.3df amendments to Clause 167, but not the base clause. The multimode lesson quotes SR/VR reach and lane details that need the base text as well. |
| Medium | **IEEE 802.3-2022 Clause 118** | Clause 118 is relevant to 200/400G extender/AUI architecture. It is not the 800G RS. Annex 120F is present in the 802.3ck amendment. |
| Medium | **P802.3dj/D3.2 Clauses 184–187** | The app mentions 800G LR1/ER1 families. These clauses cover special later PHY variants and are missing; add them if those claims remain in scope. |
| Medium | **Current Clause 45, 73, 90 and 162/163 amendment pages** | The folder has older full text and some amendment pages, but the app discusses current 800G/1.6T management, autonegotiation, time sync and electrical PMDs. Version-specific changes need the relevant amendments. |
| External to 802.3 | **IEEE 802.1Q, 802.1AE and applicable form-factor/MSA sources** | PFC, MACsec and module claims cannot be verified from the IEEE 802.3 PDFs. Keep those explicitly outside the 802.3 source coverage. |

## Filing and scope notes

- The mixed 802.3ck file and the 802.3df Clause 167 file have been split or
  renamed as recorded above. The 802.3df Clause 167 file still contains only
  amendment text; the complete base Clause 167 remains to be added.
- The 802.3dj D3.2 files are draft excerpts. Keep version labels with findings
  because later revisions could change requirements.
- This pass checked the central numerical claims and clause routing listed above.
  It is not a line-by-line conformance review of every optical table, quiz or
  diagram. Those need the missing base clauses first.
