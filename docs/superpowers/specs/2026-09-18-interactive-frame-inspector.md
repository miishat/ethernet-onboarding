# Interactive Frame Inspector Design

Status: planning handoff based on the requested mockup and subsequent discussion. No application implementation is authorized by this document alone.

## Agreed product behavior

1. Add an optional Interactive Frame Inspector. Preserve the existing nine-step TX and RX "Follow a frame" walkthroughs.
2. Add "Inspect this stage" to the walkthrough and a separate "Frame inspector" entry. Returning restores the original topic, walkthrough step, rate, direction, and lane generation.
3. Show actual addresses, payload bytes, calculated FCS, encoded blocks, scrambled bits, FEC parity, lane assignments, and PAM4 symbols where the implemented profile supports them. Do not promote the illustrative mockup arrays into calculated results.
4. Use a stage rail, synchronized input/output panels, clickable data units, a field inspector, "What changed?" explanation, and Previous/Next controls. Preserve the app's Inter/JetBrains Mono typography, amber actions, blue diagram accents, and light/dark themes.
5. PAM4 output is a sequence of calculated symbol labels and normalized levels, not measured voltage or an eye diagram.
6. Implement and review on a separate branch, with no merge or deployment as part of implementation.

## Implementation decisions proposed by this plan

- First complete calculation profile: **400GBASE-DR4 transmit**, pinned to a verified published IEEE 802.3 edition and its applicable PCS/PMA/PMD clauses. Verification of exact rules is a required first engineering deliverable. This is a scope decision for review, not an assertion that all rules have already been established.
- The inspector uses that explicit profile independently of the walkthrough's context. On entry from RX, 800G, 1.6T, or 200G/lane, explain the supported TX profile and offer a clearly labeled "Open 400G TX example" action. Never silently relabel that calculation as the original context.
- Full RX decoding, error correction, 800G/1.6T engines, 200G/lane profiles, analog channel simulation, VLAN/jumbo support, PCAP import, and user accounts are outside the initial implementation.
- Editable untagged Ethernet II sample: destination/source MAC, EtherType, and 0 through 1,500 payload bytes as hex. Add zero padding to a minimum 46-byte data field. Default to 64 deterministic payload bytes and an experimental EtherType so arbitrary sample bytes are not presented as a valid IPv4 packet.
- Preserve drafts and computed results in application memory across navigation. Reload starts with the default sample; URLs encode navigation, not arbitrary payload bytes. No implicit browser storage of frame contents.
- Detailed inspector stages: MAC, 64B/66B, 256B/257B, scrambling, alignment markers, FEC, PCS lanes, physical lanes, PAM4. The mockup's five groups may be used as visual section headings, but must not hide alignment-marker or transcoding work.
- Use one deterministic, finite transmit window with explicit initialization and surrounding idle traffic. Record bit/symbol order, all scrambler/PRBS state, marker phase, lane phase, and frame position. A frame alone is insufficient input to a reproducible PHY calculation.
- Support inspection of computed blocks at explicit offsets rather than rendering an entire bitstream. Use typed arrays, bounded windows, and worker computation if necessary for responsiveness.

## Global constraints

- Preserve the existing nine-step TX and RX walkthroughs and existing `?view=frame` links.
- Keep the inspector optional and restore the original learning context on return.
- Calculate displayed values from the applied sample and a named, verified profile.
- Never label illustrative or unverified results as calculated, measured, or standards-conformant.
- First complete calculation profile is 400GBASE-DR4 transmit; other profiles remain explicit unsupported states.
- Do not use em dashes in new product copy or documentation.
- Use React 18, TypeScript strict mode, Vite, existing theme tokens, and Vitest.
- Keep the static GitHub Pages deployment and `/ethernet-onboarding/` production base path working.
- Add no production backend, network dependency for calculations, or account system.
- Preserve unrelated working-tree changes and do not commit them to the feature branch.
- No merge, deployment, or protected-branch push is part of this plan.

## Acceptance criteria

| ID | Required outcome |
|---|---|
| A1 | Existing stack/search/walkthrough behavior and URLs remain usable. |
| A2 | Open inspector from any walkthrough step, map by stable stage ID, and return to the exact original context. |
| A3 | Valid edited frames produce exact bytes, padding, lengths, and FCS; invalid input never updates applied results. |
| A4 | Every calculated stage is independently verified and chained to the same input run. |
| A5 | Users can select fields/blocks/codewords/lanes/symbols and see offsets, values, representations, and honest dependency information. |
| A6 | Unsupported contexts cannot display outputs under the wrong profile or claim RX computation. |
| A7 | Keyboard use, search-dialog precedence, small screens, reduced motion, both themes, loading, and errors are covered. |
| A8 | Frozen reference vectors, reproducibility metadata, and validation commands accompany the review. |
| A9 | Work is isolated on `codex/interactive-frame-inspector` and ready for review without modifying main. |

## Visual reference

The reviewed in-conversation mockup is at `C:/Users/misha/.codex/visualizations/2026/09/18/01a0b6c8-06f3-7443-81cb-c4a38a203a5b/frame-inspector.html`. It is a visual reference only, not an encoder implementation or a portable project dependency. The layout and behavior are fully described above so execution does not require this local file.

## Evidence and unresolved protocol work

Current source content and `research-brief.md` describe mechanisms and teaching diagrams, not tested encoders. Verify algorithm details independently before implementation. Useful primary starting points:

- [IEEE machine-readable extracts](https://www.ieee802.org/3/publication/index.html).
- [Clause 119 marked-up draft, April 2016](https://www.ieee802.org/3/bs/public/16_05/ofelt_3bs_03_0516.pdf). Historical orientation only; not sufficient to certify a published profile.
- [Annex 172A scrambled/marker inputs](https://www.ieee802.org/3/publication/df/Annex_172A_Table_172A-1_and_Table_172A-2.txt) and [codewords](https://www.ieee802.org/3/publication/df/Annex_172A_Table_172A-3_to_Table_172A-6.txt). These are 800G examples; use only where the shared RS primitive and conventions are independently established, not as full 400G golden streams.

The plan deliberately makes source verification a dependency of the PHY engine. If exact rules or independent vectors cannot be obtained, report that specific blocked subsystem and continue the MAC/UI work. A partial implementation is not acceptance of A4 or completion of this feature.
