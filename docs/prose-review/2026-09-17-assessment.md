# Ethernet onboarding editorial review

Review date: 2026-09-17.

## Start here

The original material had useful technical detail and a strong visual structure. Your concern about its voice was justified. Many passages read like a polished technical essay: they delivered a memorable conclusion before establishing the mechanism, used dramatic contrasts, and sometimes turned useful engineering observations into universal rules.

This pass rewrites all 93 existing lesson passages and all 18 walkthrough notes. It reviews the accompanying 93 parameter-table sets, 42 quiz questions, 11 glossary definitions, diagram specifications, opening guidance and walkthrough companion text. Supporting fields were changed where needed, not rewritten merely for uniformity. All 103 topic IDs and their order are preserved. Ten outline pages remain outlines, with three outline descriptions made more neutral. No unsupported lessons were filled in.

Read these reports separately:

- [Before: complete lesson and walkthrough snapshot](2026-09-17-before.md).
- [After: complete lesson, walkthrough and diagram snapshot](2026-09-17-after.md).
- [Comparison: changed lesson fields and diagram captions](2026-09-17-changes.md).

The before snapshot is the state immediately before this comprehensive pass, not the original project before our earlier discussion. Diagram captions were retained separately during the diagram review and appear in the comparison report. The before snapshot is not a complete source-code or diagram-layout backup. UI and diagram-layout changes are summarized below.

## Before and after assessment

These are editorial judgments, not measured learner outcomes. A score of 10 would require the material to work exceptionally well for its intended readers, not simply for its editor. I would not honestly certify a 10/10 from a writing pass alone.

| Dimension | Before | After | Reason |
| --- | --- | --- | --- |
| Teaching progression | 6/10 | 9/10 | Definitions and mechanisms now precede consequences. Overviews point readers toward the next useful lesson. |
| Natural teaching voice | 5/10 | 9/10 | Removed essay-like punchlines, speculative motivations and repeated rhetorical contrasts. The text explains the operation directly. |
| Restraint and qualification | 5/10 | 9/10 | Separates requirements, reference examples, simplified models, debugging clues and draft-dependent details. |
| Readability | 8/10 | 9/10 | Shorter conceptual steps, explicit units and boundaries, less duplicated arithmetic, and clearer terminology. |
| Concrete technical detail | 8/10 | 9/10 | Retains code sizes, field widths, mapping distinctions, timing examples and measurement interpretation while correcting their scope. |

“AI-y” is a useful description of the reading experience, but it is not evidence of authorship. The underlying problem was not that every metaphor was bad. It was that the prose often sounded more certain and more conclusive than the teaching or evidence supported.

For example, the old minimum-frame lesson opened with “The 64-octet minimum is a fossil” and then asserted why changing it would be too costly. The revised lesson starts with how the minimum is counted and how padding works, then explains the historical collision-detection context without inventing a modern economic justification. The old FEC-cliff lesson called the healthy-looking metric “the uninformative one.” The revision explains what zero observed loss establishes, what it does not establish, and which additional measurements help.

## How the documentation skill influenced the revision

The reader-first documentation approach made the main progression: identify the representation or problem, explain the operation, show the consequence, and state the relevant boundary. This is a teaching guide, not a rigid paragraph template. Technical definitions and examples remain; the revision does not replace precise material with generic reassurance.

The opening now recommends a TX or RX reading route and distinguishes the MAC, PHY and medium. The walkthrough explicitly describes a schematic path, not a complete simulation. Rate, electrical lane generation and optical PMD selection are no longer treated as the same choice.

## Technical correction and qualification ledger

### Frame accounting and CRC

Clarifies frame versus packet, FCS coverage, client data versus padding, and octet times versus transmitted frame octets. The occupancy caption incorrectly referred to 26 octets of overhead; the basic untagged calculation uses 14 header + 4 FCS + 8 preamble/SFD + 12 average gap = 38 octet times. Minimum occupancy is 64 + 8 + 12 = 84 octet times. CRC is strong error detection, not proof that silent corruption is impossible. Terminology follows the [IEEE 802.3 editorial requirements](https://www.ieee802.org/3/WG_tools/editorial/requirements/words.html).

### RS correction, Gray mapping and error propagation

More than 15 erroneous RS symbols means correction is not guaranteed, not that every such pattern must produce one predetermined outcome. Gray coding makes adjacent PAM4 labels differ by one bit; it does not automatically halve ten-bit RS symbol errors. The burst discussion separates channel events, DFE propagation and descrambler output errors. Outer FEC decoding precedes descrambling. References: [IEEE PAM4 error-mapping analysis](https://www.ieee802.org/3/df/public/22_11/ran_3df_01_2211.pdf), [DFE model](https://www.ieee802.org/3/bj/public/mar12/brown_01a_0312.pdf), and [Clause 119 decoder-detection discussion](https://www.ieee802.org/3/df/email/logic/msg00011.html).

Clause 119 pair marking is distinguished from revision-dependent stateless-scrambler error-extension rules. No claim is made that failure in one codeword proves the decoder cannot identify that codeword. See the [IEEE error-marking revision discussion](https://www.ieee802.org/3/dj/public/25_07/nicholl_3dj_01_2507.pdf).

### Inner optical FEC and signaling rates

Inner FEC is scoped to applicable optical PHYs and modes, not every 200G electrical lane or every 1.6T path. The walkthrough's electrical rate labels are explicit. It no longer assigns the electrical 106.25 GBd figure universally to 200G-class optics. The optical baud label defers to the PMD and inner-FEC mode instead of inventing a universal value. Reference: [IEEE Clause 177/optical interface material](https://www.ieee802.org/3/dj/public/25_01/brown_3dj_03b_2501.pdf).

### TDECQ

Explains reference-receiver processing and a power-penalty result, not operational BER. Older nominal sample positions of 0.45 and 0.55 UI are distinguished from permitted timing optimization; sample-position separation is 0.1 UI. Reference: [IEEE TDECQ timing discussion](https://www.ieee802.org/3/bs/public/17_09/king_3bs_01a_0917.pdf).

### Linear optics and module capacity

Removes unsupported “typical” wattages, universal reach advice and the false suggestion that LPO has no specification basis. Linear-interface specifications and qualified interoperability exist; total system power and the actual host/module/channel requirements still matter. References: [LPO MSA specification](https://www.lpo-msa.org/files/live/sites/lpomsa/files/specs/LPO_MSA_Specification_v1p0_final.pdf) and [multi-vendor interoperability announcement](https://www.lpo-msa.org/news/lpo-msa-announces-successful-multi-vendor-interoperability).

Corrects electrical capacity versus optical lane count and the reversed AUI mapping table. An AUI name does not prescribe a cage. Eight nominal 200G lanes and sixteen nominal 100G lanes both give 1.6T electrical capacity. Sixteen nominal 200G lanes give 3.2T capacity, not proof of an Ethernet PMD. Reference: [OSFP MSA capacity overview](https://www.osfpmsa.org/assets/pdf/OSFP1600_and_OSFP-XD.pdf).

### MACsec overhead

Separates the two-octet EtherType from the SecTAG itself. SecTAG is six or fourteen octets, with an added header of eight or sixteen when EtherType is included. With a sixteen-octet ICV, those fields add 24 or 32 octets. Padding and encapsulation still need to be accounted for. The diagram's old “16-octet SecTAG” label now identifies EtherType plus SecTAG. Reference: [IEEE MACsec frame-format material](https://www.ieee802.org/1/files/public/docs2010/new-seaman-1AE-markup-for-gcm-aes-256-0710-v2.pdf). Subtracting the separately identified two-octet EtherType from the combined header gives the SecTAG widths.

### Debugging and timing claims

Lane-specific lock failures and Local/Remote Fault now prioritize checks without asserting a proven failed component. COM results are scoped to their reference model and do not waive other compliance limits. Delay bounds contribute to timestamp uncertainty rather than exclusively determining accuracy. Optical Clause 73 negotiation is distinguished from electrical host-interface training.

## UI and diagram changes beyond captions

- Opening copy: “The banded column is the PHY data path” becomes “The main column runs from MAC through the PHY to the medium.” The introduction explains the separate teaching box for FEC and adds electrical module-interface training nuance.
- Walkthrough companion: replaces the claim that every step simply shows one frame's payload with a description of frame data and interface control in a simplified path. It explicitly notes that the walkthrough does not select an optical PMD.
- Rate overview: includes the 400G two-lane P802.3dj electrical example and distinguishes published references from draft extensions.
- Transcoding diagrams: use a generic indicator rather than an unverified fixed polarity. The control diagram describes preserved information without claiming an unsupported universal 4 + 8 + 244 bit partition.
- Fold example: fixes the 800G logical PCS count from 8 to 32. The 1.6T 16:8 illustration is explicitly an electrical-to-optical example, not a confirmed PCS count.
- Scrambler diagrams: remove guaranteed balance and exact error-position implications. Stage drawings are identified as illustrative.
- Minimum frame and MACsec drawings: correct field boundaries and captions, and distinguish useful data from padding.
- Lane-failure drawing: chooses a failure index present in the illustrated eight-lane example. It does not claim the eight illustrated lanes establish the unknown 1.6T logical count.
- FEC drawings: correct overly precise grouped-cell claims and state that message/parity boundaries are schematic.

## Boundaries and remaining uncertainty

The 1.6T PCS lane count remains unconfirmed in this application's source base. Its marker interval is not filled with an unsupported number. Outline topics remain unresearched. P802.3dj entries retain draft qualification; the public [September 2026 D3.2 comment-resolution notice](https://www.ieee802.org/3/B400G/email/msg02002.html) is not used as proof that the standard has been published.

The source ledger includes task-force presentations and draft discussions, not only published normative text. Those support the qualified architectural explanations; revision-sensitive requirements must still be checked against the applicable specification. This pass is not an independent standards-conformance certification and cannot promise mathematical absence of errors. It deliberately avoids adding unverified detail to create an appearance of completeness.

The remaining path to a credible 10/10 is learner evidence: check whether a new reader can explain data/control, logical/electrical/optical lanes, symbol correction capacity and the TX/RX order without coaching. That is separate from this editorial implementation.

## Verification

- TypeScript checking and production build passed with `npm run build`.
- All 23 existing Node UI checks passed. One copy assertion was updated to match the corrected occupancy caption.
- `npm test` could not complete its Vitest phase because the Vitest executable is absent from this workspace's installed dependencies. The dependency is declared in package.json; dependencies were not changed for this editorial task.
- The review script confirms unchanged topic IDs/order, valid answer indices for all 42 quiz questions, all referenced inline definitions present, and no em dashes in current lesson/walkthrough content.
- These software checks do not verify Ethernet factual correctness. Technical review and the source ledger serve that separate purpose.

Review tooling: `scripts/prose-review.cjs` regenerates the after snapshot and comparison from the retained baseline. It emits patches rather than directly writing source files. The edit maps record the initial rewrite and supporting-field pass; later targeted refinements are captured by the final comparison report.
