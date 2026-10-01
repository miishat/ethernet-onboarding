# 400G TX IEEE Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify the existing 400G TX calculation against IEEE Std 802.3-2022 and expose the verified stages with accurate source and implementation-choice labels.

**Architecture:** Keep the current experimental profile reproducible while adding the verified `400gbase-dr4-tx-v1` path through the existing engines. Verify MAC, interface construction and PCS rules from local final sources, and compare the complete 400G Annex 119A stream and both FEC codewords. Physical lane ordering remains a named implementation choice, with separate stage support and provenance.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, Playwright, standalone Python reference scripts, local IEEE PDFs.

**Spec:** `docs/superpowers/specs/2026-09-18-interactive-frame-inspector.md`, especially A3, A4, A6 and A8; `docs/inspector-profile.md` and `docs/inspector-ieee-line-check.md` define the existing verification gate. This plan supersedes their statements that Clauses 49 and 82 and Annex 119A are unavailable, once the checks below pass.

## Global Constraints

- Pin evidence to IEEE Std 802.3-2022. Preserve edition, printed pages, PDF hashes and exact verification scope.
- Support the existing 400G TX / 100G physical lane context. RX, 800G, 1.6T and 200G physical lanes remain outside this verification change.
- Preserve the existing experimental profile's initialization conventions and fixtures. New evidence does not retroactively verify historical candidate results.
- Do not claim hardware certification, analog simulation or a universally defined physical lane sequence.
- Preserve the current walkthrough, URL context restoration, frame editing, themes and worker cancellation.
- Preserve unrelated local edits. Execute implementation in an isolated branch based on current main.
- No merge, deployment or push is part of implementation.
- Do not use em dashes. Use medium effort or lower for implementation, testing, research and review.

## Evidence from the initial comparison

Read-only probes on 2026-10-01 extracted Annex 119A Tables 119A-2, 119A-5 and 119A-6 from the supplied PDF. These probes are diagnostic evidence, not admitted fixtures.

- The extracted 400G stream contains all 40 rows, totaling 10280 bits. Each codeword contains 5440 bits across 17 rows.
- `transcode257Group` reproduces the Annex's constant-Idle block exactly.
- `splitFecMessages` and `encodeClause119Codeword` reproduce all 544 symbols in each published A and B codeword when given the published marked stream.
- `scrambleBits` reproduces all 8224 non-marker bits when Annex seed `S<0:57> = 24E6959D0FA5DBD` is reversed into the engine's oldest-to-newest history representation.
- `insertMarkers` reproduces all 2056 marker bits when Annex seed `P<0:8> = 0x100` is reversed from the current integer-to-LSB-vector adapter.
- Targeted baseline: 54 tests pass; two fail because Python script bytes use CRLF while recorded hashes describe LF. The normalized marker script hash agrees with its recorded hash.

## Review Focus

- Asymmetric seeds must expose orientation errors that all-one teaching defaults conceal.
- Terminate controls must work at every valid position, including data octet 0xFD before the actual control delimiter.
- Interface Start placement and frame gaps must obey Clause 117/81 rules for the 400G stream, including user-selected prefix lengths.
- Marker cadence boundaries, nonzero phase and rate matching must agree between size estimation, preparation and insertion.
- A verified PCS result must retain the selected PMA ordering and normalized PAM4 label disclosures at later stages.

## Task 1: Admit source evidence and a published reference fixture

**Files:** Create `.gitattributes`, `scripts/extract-annex119a.py`, `test/fixtures/inspector/ieee-8023-2022-119a-400g-idle-am.json`, `test/inspector-ieee-reference.test.ts`; update `docs/inspector-ieee-line-check.md` and fixture manifest after admission.

**Interfaces:** Fixture JSON records edition, source path/hash, printed pages, table IDs, initial states, 257-bit Idle input, 10280 marked bits and 544 numerical symbols per codeword. The extraction script reads the local PDF with pypdf, checks row ranges, widths and complete coverage, and writes canonical JSON with no dependency on the TypeScript engine.

- [ ] Add fixture integrity tests requiring ID `ieee-8023-2022-119a-400g-idle-am`, Tables 119A-2/5/6, stream length 10280, two codewords of 544 symbols, and seeds `24E6959D0FA5DBD`, `0x100`, status bits `000`.
- [ ] Require SHA-256 agreement for the exact source PDF and canonical fixture. Confirm missing, duplicate, out-of-range and truncated table rows are rejected by extraction checks.
- [ ] Run the tests and observe failure before adding the fixture. Extract it, inspect its table rows against the PDF, and pass the same checks. Distinguish leading hex display padding from transmitted bits.
- [ ] Record final source facts for Clause 49.2.6, Clause 82 tables/controls, Clause 117/81 stream rules, Clause 119 transmit processing, Clause 120 mapping freedom, Clause 124 PAM4 scope, and Clause 3 MAC/FCS. Each rule receives an explicit admitted or unresolved status.
- [ ] Add `scripts/*.py text eol=lf` to `.gitattributes` and normalize the existing Python scripts without changing their contents or stored source hashes. Run the previously failing script integrity tests.
- [ ] Commit the evidence and fixture only after its integrity and independent review requirements are satisfied. Do not enable a profile in this task.

## Task 2: Verify and correct seed adapters and PCS processing

**Files:** Create `src/inspector/engine/ieeeState.ts`; update `run.ts` and existing PCS engines only for demonstrated discrepancies; extend `test/inspector-ieee-reference.test.ts`, `test/inspector-pcs.test.ts`, `test/inspector-scramble-markers.test.ts`, `test/inspector-distribution.test.ts`.

**Interfaces:** `parseIeeeScramblerState(seedHex: string): Uint8Array` validates a 58-bit hexadecimal vector and maps IEEE S-index order into internal oldest-to-newest history. `parseIeeeMarkerState(seed: number): Uint8Array` validates a 9-bit integer vector and maps IEEE P-index order into internal PRBS state. The experimental path keeps its legacy adapters.

- [ ] Add failing tests for both asymmetric published seeds and values outside 58/9-bit ranges. Verify that the adapters reproduce the exact Annex states and reject overflow rather than silently truncate.
- [ ] Build 128 all-Idle 64B/66B inputs, transcode to 32 blocks, scramble continuously, insert one eight-block marker at phase zero, and compare every bit with Table 119A-2.
- [ ] Compare both complete generated FEC codewords with Tables 119A-5/6, including parity. Independently test splitting the input at non-block boundaries and continuing the scrambler state.
- [ ] Check Clause 82 Figure 82-5 and Table 82-1 against encoder cases. Test all eight Terminate positions, mixed data/control content, invalid sync headers, and a data byte `0xFD` preceding an actual Terminate control. Fix any discrepancy while preserving valid data.
- [ ] Run `npx vitest run test/inspector-ieee-reference.test.ts test/inspector-pcs.test.ts test/inspector-scramble-markers.test.ts test/inspector-distribution.test.ts` and commit when green.

## Task 3: Verify frame-to-PCS composition and selected physical mapping

**Files:** Update `stream.ts`, `run.ts`, `validation.ts`, `types.ts`, `defaults.ts` and `pma.ts`/`pam4.ts` only as evidence requires; extend `test/inspector-mac.test.ts`, `test/inspector-run.test.ts`, `test/inspector-pma.test.ts` and the IEEE reference tests.

**Interfaces:** Extend `RunInput.profileId` to accept `400gbase-dr4-tx-v1` and the existing experimental ID. `buildInspectorRun(input: RunInput): Result<CompleteInspectorRun>` and `estimateRunSize(input: RunInput): Result<RunSize>` share profile selection, initialization and scheduling semantics. Run provenance identifies IEEE-checked stages and separately records the chosen rate-match and PMA mapping IDs.

- [ ] Verify MAC padding, FCS algorithm and serialization against Clause 3; test empty, minimum-length and 1500-byte payloads with an independent reference calculation.
- [ ] Verify preamble, Start lane placement, Terminate and trailing gaps against the Clause 117/81 chain. Test every currently accepted prefix-length class; reject or explicitly align values that violate the selected interface contract.
- [ ] Add marker phase tests at 0, 1, 163839, 163840 and inside a FEC pair. Require consistent reservation counts, complete codeword pairs, bounded allocation and no deletion of frame data. Fix estimator or phase logic when it disagrees with the documented contract.
- [ ] Review bit multiplexing, dibit significance, Gray labels and precoder selection against final Clauses 120/124 and their referenced rules. Keep `reference-16x4-bit-mux-v1` explicitly implementation-specific even when its permitted behavior is checked.
- [ ] Generate an independent nonzero frame fixture with all stages and state recorded. Preserve the published all-Idle fixture as the separate PCS oracle; do not imply it validates arbitrary MAC frames alone.
- [ ] Run MAC, run, worker, PCS, FEC and PMA test suites; commit after the recorded rule register has no unresolved rule within the exposed verified scope.

## Task 4: Enable accurate capabilities and update the inspector

**Files:** Update `profiles.ts`, `engine/referenceTables.ts`, `types.ts`, `useInspectorRun.ts`, `App.tsx`, `FrameInspector.tsx`, `StageRail.tsx`, `StageWorkspace.tsx`, and affected component tests and `e2e/inspector.spec.ts`.

**Interfaces:** `getProfileSupport("400G", "tx", "100")` enables the completed profile only after verified evidence is admitted. `getStageSupport(profileId, stage)` reports `ieee-verified` for verified MAC-through-PCS stages and `reference-mapping` for the selected physical lane sequence. The experimental contract remains separately available.

- [ ] Replace the expected-failing verification test with passing assertions requiring the admitted source rules and published fixture ID. Unsupported rate/direction/lane tuples must still fail before constructing a run.
- [ ] Make the application and worker select the verified profile for supported contexts. Update immutable run provenance and snapshots so they describe the profile actually used.
- [ ] Use supported-context copy: `400G transmit calculation checked against IEEE Std 802.3-2022. Physical lanes use the selected reference mapping.` Use unsupported-context copy: `Calculation is currently available for 400G TX at 100G per lane. Select the 400G TX example to inspect calculated values.`
- [ ] Verify field edits, Apply, stage navigation, worker supersession and unsupported deep links. Later-stage copy must preserve the named physical mapping and normalized-level meaning.
- [ ] Run relevant component tests and `npx playwright test e2e/inspector.spec.ts`; commit only after the new capability behavior and provenance tests pass.

## Task 5: Review, document and complete verification

**Files:** Update `README.md`, `docs/inspector-profile.md`, `docs/inspector-missing-sources.md`, `docs/inspector-ieee-line-check.md`, `docs/ieee-knowledge-base-audit.md` and fixture manifest/review records.

- [ ] Replace current missing-source statements with completed verification facts, source locations, fixture hashes, selected-policy limits and the independently reviewed scope. Correct the audit's stale statement that Annex 172A is absent, after checking its existing local file.
- [ ] Review the complete source-to-output chain and admitted fixture independently with medium effort or lower. Resolve consequential findings before enabling the completed profile; record reviewer identity and scope without claiming more than the review establishes.
- [ ] Run `npm test`, `npm run typecheck`, `npm run build`, and `npm run test:e2e`. Investigate relevant failures; report unrelated baseline failures precisely.
- [ ] Check the final diff for unsupported conformance claims, mutation of frozen evidence, fixture self-confirmation, stale paths, and accidental inclusion of unrelated changes.
- [ ] Record completed checks and remaining implementation choices. Commit the final review/documentation changes and provide a reviewable branch without merging or publishing.

## Plan review

This completes verification of the first calculation profile. Additional speeds and RX require separate implementation specifications and engines. The existing experimental fixtures remain historical evidence; published Annex output is the oracle for the newly verified PCS path.
