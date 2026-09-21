# Inspector profile contract: verification blocked

Status updated 2026-09-21: **incomplete**. The shared data types, requested teaching defaults, and capability gate are available. The protocol algorithms and end-to-end fixture contract are not verified. `getProfileSupport` returns `supported: false` for every selection, including `400G / tx / 100`. Matching those three values is necessary for future support, but is not evidence of verified computation. No PCS, lane, or PAM4 results are supplied. A new research pass found final evidence sufficient for standalone RS(544,514) arithmetic only; that primitive must remain isolated from this blocked profile. See `docs/inspector-source-research-2026-09-21.md`.

## Intended scope and API

The reserved profile ID is `400gbase-dr4-tx-v1`. The selected target edition is **IEEE Std 802.3-2022**, without assuming later amendments. Its normative text must be checked before the profile is enabled. Metadata describes the intended 16 PCS lanes, four physical lanes and 53.125 GBd geometry. These values are candidate metadata, not an implemented mapping. The draft sources below provide context for 16 lanes and 53.125 GBd, but do not establish the selected edition's algorithms.

`types.ts` supplies the interfaces in Task 2. `PROFILE`, `PROFILE_VERIFICATION`, `DEFAULT_FRAME`, and `DEFAULT_STREAM` are frozen. Consumers should copy a default into editable state and call `getProfileSupport(rate, dir, gen)` before constructing any complete run. The separate verification state does not change the agreed `Profile` interface. Rejections explain an unsupported rate, direction or lane generation before reporting the verification block for the intended tuple.

`DataRef` uses a zero-based half-open interval `[start, start + count)` in its buffer's units. A buffer ID is resolved within its stage. Octet and bit buffers use `Uint8Array`; RS-symbol buffers can use `Uint16Array`. A bit buffer has one bit per element, not packed octets. `MacFrame.bytes` denotes destination through FCS; `withoutFcs` omits FCS and neither buffer includes preamble, SFD or idles. These are application representation decisions, not substitute serialization rules. A later implementation must not label a partial run as the complete named profile.

## Teaching defaults and bounded execution

The frozen draft contains destination `02:00:00:00:00:02`, source `02:00:00:00:00:01`, EtherType text `88B5`, and the 64 payload octets `00` through `3F`, ascending. Hex text represents octets in display order and is not a bit-serialization rule. The payload is a local experimental teaching sequence with no IP, TCP or other higher-layer interpretation. This is the requested local example; this task does not establish EtherType allocation rules.

The requested initialization is `scramblerSeedHex = 3FFFFFFFFFFFFFF` (58 one bits), `markerPrbsSeed = 0x1ff`, `markerBlockPhase = 0`, `lanePhase = 0`, and `prefixIdleOctets = 4096`. These values preserve the requested state while verification is blocked. They are not asserted to be a valid hardware reset state. Acceptance by the scrambler and marker PRBS recurrences is still unverified.

The proposed phase convention is: marker phase zero names the boundary immediately before the first bit of an inserted alignment-marker group; lane phase zero names the first distribution unit assigned to logical lane zero at that same boundary. To make this executable, the published rules must establish the marker group boundary relative to transcoded blocks, FEC messages and lane distribution units, including whether counters include inserted groups and deleted idles. Until then these fields must not drive computation. In particular, zero phase does not imply that 4096 prefix idles can simply be added after a marker without compensation.

After verification, a run must add the minimum legal trailing idles needed to finish its final FEC codeword pair and lane-distribution group without truncating the requested frame. Exact idle counts and rounding rules remain blocked by the distribution and compensation rules below. `MAX_CODED_BITS = 262144` is an application limit on total coded output across lanes, including prefix, markers, frame, parity and trailing completion. A future run builder must calculate the required size and reject an over-cap request with a `run` error before allocating output; it must never truncate a frame. There is no run builder yet, so this task does not claim that cap enforcement is implemented. Later marker boundaries require a verified, phase-controlled window with the correct starting state, not storing a full marker period or resetting state at the window boundary.

## Source ledger

All retrievals and attempts below occurred on **2026-09-20**. A URL being accessible does not mean its contents are normative for the selected edition.

| Reference ID | Edition, exact inspected location and URL | Verified scope |
| --- | --- | --- |
| `ieee-8023-2022` | IEEE Std 802.3-2022, [IEEE SA publication page](https://standards.ieee.org/ieee/802.3/10422/) | Edition and publication metadata; this page does not supply the algorithms. |
| `ieee-8023-2022-access` | [IEEE GET series](https://ieeexplore.ieee.org/browse/standards/get-program/page/series?id=68), [document 9844436](https://ieeexplore.ieee.org/document/9844436), [PDF entry point](https://ieeexplore.ieee.org/stamp/stamp.jsp?tp=&arnumber=9844436) | GET returned HTTP 418 in the browsing tool; the document and PDF entry points did not expose the normative text. No authenticated or purchased access was attempted. |
| `ieee-8023-2022-errata` | IEEE Std 802.3-2022 correction sheet, 9 February 2024, [pages 2-4, Clauses 30 and 78](https://standards.ieee.org/wp-content/uploads/2024/02/802.3-2022_errata.pdf) | Retrieved; does not fill the missing MAC/PCS/PMA/DR4 text. |
| `ieee-bs-approval` | IEEE Std 802.3bs-2017, [task-force completion notice](https://www.ieee802.org/3/bs/) | Confirms approval on 6 December 2017; earlier draft material is not the published standard. |
| `ieee-bs-d14-cl119-locator` | IEEE P802.3bs/D1.4, 7 April 2016, [marked-up Clause 119 contribution](https://www.ieee802.org/3/bs/public/16_05/ofelt_3bs_03_0516.pdf), Figure 119-2 on PDF page 3; 119.2.4.3 and 119.2.4.4 on PDF page 9 | Draft only. Figure locates 16 lanes; scrambler subclause refers to 49.2.6. Useful search locators, not an accepted rule set. |
| `ieee-bs-dr4-geometry-context` | September 2017 contribution discussing P802.3bs/D3.3, [Tamura/Akashi, PDF page 8 comparison table](https://www.ieee802.org/3/bs/public/17_09/tamura_3bs_01a_0917.pdf) | DR4 context lists 53.125 GBd and Clause 124. This is a contribution, not a published normative table. |
| `ieee-bs-draft-vector-warning` | May 2016 contribution, [Dillard, PDF pages 2-4](https://www.ieee802.org/3/bs/public/16_05/dillard_3bs_01_0516.pdf), proposed Annex 119A examples | Reports a parity error in draft 1.3 and proposes corrections. Not accepted as a golden vector. |
| `ieee-publication-index` | [IEEE machine-readable extracts index](https://www.ieee802.org/3/publication/index.html), Annex 172A entries | Identifies public 800G vectors; does not establish compatibility with this 400G profile. |
| `ieee-df-172a-rs-candidate` | IEEE Std 802.3df-2024, Annex 172A, [Tables 172A-3 through 172A-6](https://www.ieee802.org/3/publication/df/Annex_172A_Table_172A-3_to_Table_172A-6.txt) | Source bytes retrieved and hashed. Four labeled 800G codewords; bit and field conventions remain unverified. |
| `ieee-df-172a-input-candidate` | IEEE Std 802.3df-2024, Annex 172A, [Tables 172A-1 and 172A-2](https://www.ieee802.org/3/publication/df/Annex_172A_Table_172A-1_and_Table_172A-2.txt) | Source bytes retrieved and hashed. Labeled 800G input examples; not admitted as 400G expected results. |

`engine/referenceTables.ts` intentionally contains only a source inventory and unresolved-rule IDs. There are no invented control codes, marker patterns, polynomial constants, lane maps or Gray-label tables.

## Exact rules still required

Every item below is unresolved for **IEEE Std 802.3-2022**. The clause references are investigation targets, with the accessible draft locators identified above where applicable. Exact normative table numbers must be recorded after reading the selected published text; none are fabricated here.

| Rule ID | Required evidence before implementation |
| --- | --- |
| `mac-frame-fcs` | Clauses 3 and 4: frame field sizes and order, minimum/maximum supported untagged frame, padding coverage, FCS initialization, polynomial, reflection/complement and byte transmission order. |
| `rs-cdmii-placement` | Clause 117: CDMII transfer ordering, preamble/SFD handling, permitted start/terminate placement, idle insertion/deletion and frame-boundary constraints. |
| `encode66-control-tables` | Clause 119 transmit encoding and its incorporated encoding clauses: complete data/control block tables, control type codes, start positions and every terminate position. Include the mixed control/data blocks actually emitted by this profile. |
| `transcode257-order` | Clause 119.2.4.2 investigation target: four-block ordering, all-data discriminator and each mixed-control transformation, including indicator-field bit positions. |
| `bit-serialization` | The selected edition's bit-index direction at CDMII, 66-bit blocks, 257-bit blocks, marker groups, RS symbols and output lanes. Printed hexadecimal order cannot be assumed to equal transmission order. |
| `scrambler-recurrence` | Clause 119.2.4.3 and incorporated 49.2.6 investigation targets: feedback recurrence, input/output feedback choice, register shift direction, first-output convention, and whether the proposed 58-bit state is admissible. |
| `am-values-status-pad` | Clause 119.2.4.4 investigation target: all marker values and lane identities, status fields, padding bit allocation, PRBS polynomial, shift direction, seed and evolution across groups. |
| `am-schedule-idle-compensation` | Clause 119 marker and rate-matching rules: exact interval and counter units, first group location, phase at a codeword boundary, and number and placement of compensated idles without damaging a frame. |
| `pre-fec-distribution` | Clause 119: exact ordered mapping from scrambled/marked blocks to each FEC message, including bit-to-symbol packing and grouping at marker boundaries. |
| `rs-field-roots-parity` | Clause 119 and incorporated FEC definition: GF primitive polynomial and basis, generator root sequence, coefficient orientation, input symbol order, shortening convention, and parity order and placement. A polynomial name alone is insufficient. |
| `codeword-interleave` | Clause 119: codeword pair order, symbol interleave order, post-FEC PCS lane distribution, and starting distribution phase. |
| `pma-16-to-4` | Clauses 120 and 124: applicable DR4 path and exact 16-to-4 multiplexing, unit size, bit ordering and lane numbering. A count of lanes does not define the mapping. |
| `pam4-dibit-gray-precoding` | Clauses 120 and 124: dibit order, exact Gray labeling and amplitude ordering, and applicability or exclusion of precoding for this optical profile. Electrical-interface precoding rules cannot be imported without evidence. |
| `independent-vectors` | Published examples for the selected profile, or a separate Python implementation reviewed against all the above rules. Verify shared RS conventions before admitting any 800G example. |

These blocks also prevent certification of phase zero, trailing completion, and an end-to-end default result. Later tasks can work on the MAC subset after separately verifying its rules and fixtures; this file does not grant that subset a verified status.

## Fixture policy and unblock procedure

`test/fixtures/inspector/manifest.json` distinguishes **candidate sources** from accepted fixtures. The accepted `fixtures` array is empty. Candidate hashes cover the exact downloaded HTTP response bytes, including labels and line endings, not interpreted protocol bits. Hashes establish source integrity only. Candidate `inputState` records the relevant published labels and explicitly unresolved conventions; it does not pretend the teaching seed generated those examples. No tests fetch the network or regenerate expected outputs.

To unblock this task, obtain readable primary text for the selected edition, resolve every rule ID with exact clause/table/page citations, and admit independently verified fixtures. For an independently implemented Python reference, record its source/revision and reviewer, all input bytes and initial state, the precise serialization convention, output artifact hash and stage-specific verification scope. Keep it independent of production TypeScript, commit the reviewed expected outputs once, and compare against those stored outputs during tests. Include mixed start/terminate blocks, marker boundaries, nontrivial RS parity, and lane/PAM4 ordering, rather than relying on round trips or all-zero examples.

Only after those requirements are met should the intended tuple's capability test change to `supported: true`. RX, 800G, 1.6T and other lane generations remain unsupported. This partial contract is not completion of Task 2's verified computation contract.
