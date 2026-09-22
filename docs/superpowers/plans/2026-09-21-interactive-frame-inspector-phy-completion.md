# Interactive Frame Inspector PHY Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Interactive Frame Inspector from MAC output through 400GBASE-R PCS values, then provide physical-lane and PAM4 values through a clearly identified project-owned reference PMA mapping.

**Architecture:** Keep every protocol transformation pure and independently testable in `src/inspector/engine`. Separate final IEEE-derived PCS behavior from the implementation-specific rate-matching and PMA choices by making both explicit, immutable run inputs with provenance. The named IEEE profile remains disabled until the final Reading Room line check and frozen fixtures pass; physical-lane and PAM4 output uses a separate `400gbase-dr4-tx-reference-pma-v1` composite profile so illustrative ordering is never presented as a universal IEEE result.

**Tech Stack:** React 18, TypeScript strict mode, Vite, typed arrays, native Web Worker, Vitest, Testing Library, Python 3 reference scripts, Playwright for browser verification.

**Spec:** `docs/superpowers/specs/2026-09-18-interactive-frame-inspector.md`

## Global Constraints

- Read `docs/inspector-source-research-2026-09-21.md` and `docs/inspector-profile.md` before every task involving PCS, FEC, PMA, or PAM4 behavior.
- Use IEEE Std 802.3-2022 as the governing Ethernet edition. Record exact clause, table, page, line, retrieval date, and access path for every admitted IEEE rule.
- Do not use third-party mirrors, draft text, secondary articles, diagrams, or production TypeScript as a final-profile oracle.
- Keep `getProfileSupport("400G", "tx", "100")` false until Tasks 1 through 6 pass their evidence and fixture gates.
- Preserve the existing walkthrough and its return position. The inspector remains an optional workspace.
- Every displayed value must derive from the applied input and the selected named computation contract.
- Display `IEEE-derived` and `reference PMA mapping` provenance separately in the UI.
- Never label normalized PAM4 levels as measured voltage or optical power.
- Keep all calculations offline and deterministic. Tests must not fetch network resources.
- Preserve absolute scrambler, marker, rate-match, FEC-pair, PMA mux, and precoder state across windows.
- Reject an over-limit run before allocation. Never truncate a frame or a codeword.
- Use TDD for every code task. Expected fixtures must be frozen independently of production TypeScript.
- Use small atomic commits with the exact messages specified below.
- Do not use em dashes in product copy or documentation.

## Current Baseline

The branch already contains:

- Editable MAC input, padding, FCS, field offsets, navigation, and the inspector shell.
- Standalone GF(2^10) and systematic RS(544,514) arithmetic in `gf1024.ts` and `rs544.ts`.
- A reviewed nonzero standalone RS fixture.
- A hard capability gate that returns `supported: false` for every profile selection.

The remaining work is divided into evidence, PCS transforms, implementation-owned scheduling, Clause 119 FEC distribution, reference PMA/PAM4 mapping, run composition, worker/UI integration, and end-to-end review.

## File Ownership and Responsibilities

| Path | Responsibility |
|---|---|
| `docs/inspector-ieee-line-check.md` | Final IEEE clause/table/page/line evidence and signed review record. |
| `docs/inspector-profile.md` | Final profile, rate-match, PMA, state, and provenance contracts. |
| `src/inspector/types.ts` | Shared immutable types for PCS, policies, fixtures, runs, snapshots, and traces. |
| `src/inspector/profiles.ts` | Stage-aware capability gate and named IEEE/reference profiles. |
| `src/inspector/engine/referenceTables.ts` | Verified constants with source IDs and exact scoped provenance. |
| `src/inspector/engine/bits.ts` | Explicit octet and bit serialization helpers. |
| `src/inspector/engine/stream.ts` | Finite CDMII stream, legal Idle completion, and rate-match preparation. |
| `src/inspector/engine/encode66.ts` | 64B/66B data/control block encoding. |
| `src/inspector/engine/transcode257.ts` | Four 66-bit blocks to one 257-bit block. |
| `src/inspector/engine/scramble.ts` | Continuous self-synchronous scrambler with explicit predecessor state. |
| `src/inspector/engine/markers.ts` | AM generation, reservation, insertion, and deletion ledger. |
| `src/inspector/engine/distribute.ts` | Pre-FEC packing, RS orientation adapter, checkerboard interleave, PCS lanes. |
| `src/inspector/engine/pma.ts` | Explicit bit-level 16-to-4 PMA mapping with carried absolute phase. |
| `src/inspector/engine/pam4.ts` | Dibit construction, optional precoder, labels, and normalized levels. |
| `src/inspector/engine/run.ts`, `trace.ts` | Bounded end-to-end composition and provenance edges. |
| `src/inspector/workerProtocol.ts`, `inspector.worker.ts`, `useInspectorRun.ts` | Async calculation and stale-response cancellation. |
| `src/inspector/components/*` | Stage views, unavailable states, provenance, values, and trace selection. |
| `scripts/inspector-reference.py` | Independent reference pipeline used only to freeze expected fixtures. |
| `test/fixtures/inspector/` | Source manifests and frozen independent vectors. |
| `test/inspector-*.test.ts(x)` | Unit, contract, controller, and component tests. |
| `e2e/inspector.spec.ts` | Browser history, worker, walkthrough, and responsive behavior. |

---

### Task 1: Complete the lawful IEEE line check and admit source artifacts

**Files:**
- Create: `docs/inspector-ieee-line-check.md`
- Modify: `docs/inspector-source-research-2026-09-21.md`
- Modify: `docs/inspector-profile.md`
- Modify: `src/inspector/engine/referenceTables.ts`
- Modify: `test/fixtures/inspector/manifest.json`
- Create: `test/fixtures/inspector/ieee-8023-2022-source-manifest.json`
- Test: `test/inspector-profile.test.ts`

**Interfaces:**
- Consumes: authenticated IEEE Reading Room or a licensed IEEE Std 802.3-2022 copy.
- Produces: immutable source records for Clauses 49.2.6, 82, 117, 119.2.4.1 through 119.2.4.7, 120.5.2, 124, and Annex 119A.

- [ ] **Step 1: Record the evidence template before inspecting text**

Create one row per required rule with these fields:

```ts
interface VerifiedRuleRecord {
  ruleId: string;
  edition: "IEEE Std 802.3-2022";
  clause: string;
  tableOrFigure: string | null;
  page: number;
  lines: string;
  retrievedOn: string;
  accessPath: "IEEE Reading Room" | "licensed copy";
  implementationConvention: string;
  reviewer: string;
  status: "verified" | "blocked";
}
```

- [ ] **Step 2: Inspect every required clause and capture concise implementation facts**

Record CDMII lane/octet order, sync headers, every emitted control type, legal Start and Terminate placement, 256B/257B bit positions, scrambler recurrence and first-output convention, AM values/status/pad order, AM cadence and reservation size, pre-FEC equations, RS orientation, checkerboard interleave, lane bit order, PMA freedom, and DR4 scope. Do not copy long copyrighted passages.

- [ ] **Step 3: Extract Annex 119A into a source manifest**

Record table IDs, exact state values, input and output row hashes, encoding direction, and which bytes or bit strings were transcribed. The manifest must distinguish source hash from interpreted-fixture hash.

- [ ] **Step 4: Write a failing capability-evidence test**

```ts
it("requires every normative rule and fixture before enabling PCS calculation", () => {
  expect(PROFILE_VERIFICATION.unresolvedRuleIds).toEqual([]);
  expect(PROFILE_VERIFICATION.fixtureIds).toContain(
    "ieee-8023-2022-119a-400g-idle-am",
  );
});
```

Expected before the source records are complete: FAIL with unresolved rule IDs.

- [ ] **Step 5: Add verified constants and source IDs only after line review**

Each constant in `referenceTables.ts` must include `sourceId`, clause, page, and a short convention. Keep any rule whose final wording cannot be inspected in `UNRESOLVED_RULE_IDS` and stop downstream execution.

- [ ] **Step 6: Independently review the transcription**

The reviewer compares the source text to every record, recomputes fixture hashes, and writes reviewer identity, reviewed commit, date, and result into both manifests.

- [ ] **Step 7: Run and commit**

Run:

```powershell
npm exec vitest run test/inspector-profile.test.ts
npm run typecheck
git diff --check
```

Expected: all commands exit 0 and no required rule remains falsely marked verified.

Commit: `docs: verify IEEE PCS source contracts`

---

### Task 2: Freeze stage-aware capability, policy, and PMA contracts

**Files:**
- Modify: `src/inspector/types.ts`
- Modify: `src/inspector/profiles.ts`
- Modify: `src/inspector/defaults.ts`
- Modify: `docs/inspector-profile.md`
- Test: `test/inspector-profile.test.ts`

**Interfaces:**
- Produces: `RateMatchPolicy`, `RateMatchDeletion`, `PmaMappingProfile`, `CalculationContract`, and `getStageSupport`.
- Consumed by: Tasks 3 through 8.

- [ ] **Step 1: Write failing contract tests**

```ts
it("separates IEEE PCS support from the reference PMA mapping", () => {
  expect(getStageSupport("400gbase-r-tx-v1", "pcs-lanes").supported).toBe(true);
  expect(getStageSupport("400gbase-r-tx-v1", "physical-lanes").supported).toBe(false);
  expect(getStageSupport("400gbase-dr4-tx-reference-pma-v1", "pam4").supported).toBe(true);
});
```

Before Task 1 passes, keep all three assertions false and retain the test as `it.skip` with a linked unresolved evidence ID. Remove the skip only in the same commit that satisfies the gate.

- [ ] **Step 2: Add exact policy types**

```ts
export interface RateMatchDeletion {
  originalWordIndex: number;
  originalOctetOffset: number;
  originalBitOffset: number;
  idleOctets: readonly number[];
  controlMask: number;
  policyId: string;
  reason: "alignment-marker-reservation" | "trailing-fec-completion";
  reservation: {
    groupIndex: number;
    insertionBitOffset: number;
    fecPairIndex: number;
    boundaryKind: "am-group" | "run-completion";
  };
}

export interface RateMatchPolicy {
  id: string;
  source: "project-owned";
  eligibleIdleControlCodes: readonly number[];
  selection: "earliest-eligible-before-reservation";
  tieBreak: "lowest-absolute-word-index";
  maximumDeferralBlocks: number;
  frameBoundaryRule: "never-remove-frame-data";
  amSchedule: {
    unit: "transcoded-257b-block";
    cadenceBlocks: number;
    reservationBlocks: number;
    fecPairBlocks: number;
    phaseZeroAbsoluteStreamBlock: 0;
  };
}
```

- [ ] **Step 3: Add exact PMA types**

```ts
export interface PmaMappingProfile {
  id: "reference-16x4-bit-mux-v1";
  kind: "implementation-specific-reference";
  sourceRevision: string;
  fixtureId: string;
  periodBits: 4;
  sourcePcsLaneByPmdLane: readonly [
    readonly [0, 1, 2, 3],
    readonly [4, 5, 6, 7],
    readonly [8, 9, 10, 11],
    readonly [12, 13, 14, 15],
  ];
  initialPhase: 0;
  firstBitSignificance: "msb";
  grayLevels: Readonly<Record<"00" | "01" | "11" | "10", -3 | -1 | 1 | 3>>;
  precoder: { mode: "none" };
}
```

The exact reference schedule is a product choice. Its UI label must say `Reference 16-to-4 mapping` and its profile ID must not be the IEEE-only ID.

- [ ] **Step 4: Add stage-aware capability output**

```ts
export interface StageSupport {
  supported: boolean;
  provenance: "ieee-verified" | "reference-mapping" | "blocked";
  reason: string;
  missingRuleIds: readonly string[];
}
```

`getProfileSupport` remains backward-compatible and becomes true only for a complete selected composite profile after all required stage gates pass.

- [ ] **Step 5: Run and commit**

Run `npm exec vitest run test/inspector-profile.test.ts && npm run typecheck`.

Commit: `feat: define PHY calculation contracts`

---

### Task 3: Build the finite CDMII, 64B/66B, and 256B/257B pipeline

**Files:**
- Create: `src/inspector/engine/bits.ts`
- Create: `src/inspector/engine/stream.ts`
- Create: `src/inspector/engine/encode66.ts`
- Create: `src/inspector/engine/transcode257.ts`
- Create: `test/inspector-pcs.test.ts`
- Add fixtures: `test/fixtures/inspector/pcs-*.json`
- Modify: `test/fixtures/inspector/manifest.json`

**Interfaces:**
- Consumes: `MacFrame`, verified Clause 82/117/119 tables, and `RateMatchPolicy`.
- Produces: `buildInterfaceStream`, `encode66Block`, `transcode257Group`, and absolute block metadata.

- [ ] **Step 1: Freeze independent fixtures**

Include all-data, all-Idle, supported Start placement, every Terminate position the generator emits, mixed control/data blocks, and frame lengths on each four-block boundary. Expected output must contain CDMII octets/control masks, 66-bit sync headers/type fields, and 257-bit results.

- [ ] **Step 2: Write failing serialization tests**

```ts
it("serializes each MAC octet in verified CDMII bit order", () => {
  expect(octetsToBits(new Uint8Array([0x81]))).toEqual(
    new Uint8Array([1, 0, 0, 0, 0, 0, 0, 1]),
  );
});
```

Use the direction verified by Task 1. If the line check yields the opposite order, change the expected literal and document why.

- [ ] **Step 3: Implement explicit bit helpers**

Provide named `octetsToBits`, `bitsToOctets`, `readBits`, and `writeBits` functions. Reject non-binary bit arrays and non-octet-aligned conversions.

- [ ] **Step 4: Write failing stream and control-block tests**

Assert preamble/SFD representation, Start placement, every generated Terminate case, legal Idle completion, and exact control masks. Assert invalid control placement returns a typed error instead of silently encoding data.

- [ ] **Step 5: Implement finite CDMII and 66-bit encoding**

```ts
export function buildInterfaceStream(
  mac: MacFrame,
  prefixIdleOctets: number,
): Result<InterfaceStream>;

export function encode66Block(word: InterfaceWord): Result<Block66>;
```

Store bits as one bit per `Uint8Array` element and preserve absolute word indexes.

- [ ] **Step 6: Write failing transcode tests**

Test an all-data group and every mixed-control group present in the frozen fixtures. Assert exactly 257 output bits for four 66-bit inputs and preserve the four source block IDs.

- [ ] **Step 7: Implement transcode and run focused verification**

```ts
export function transcode257Group(
  blocks: readonly [Block66, Block66, Block66, Block66],
): Result<Block257>;
```

Run:

```powershell
npm exec vitest run test/inspector-pcs.test.ts
npm run typecheck
```

Commit: `feat: encode finite 400G PCS blocks`

---

### Task 4: Add continuous scrambling, deterministic rate matching, and alignment markers

**Files:**
- Create: `src/inspector/engine/scramble.ts`
- Create: `src/inspector/engine/markers.ts`
- Modify: `src/inspector/engine/stream.ts`
- Create: `test/inspector-scramble-markers.test.ts`
- Add fixtures: `test/fixtures/inspector/scramble-*.json`, `marker-*.json`

**Interfaces:**
- Consumes: ordered `Block257[]`, predecessor scrambler state, marker PRBS state, absolute block phase, and `RateMatchPolicy`.
- Produces: `PreparedStream`, `MarkerPlan`, `MarkerResult`, carried states, and immutable deletion ledger.

- [ ] **Step 1: Freeze scrambler and marker fixtures**

Include a nonzero predecessor state, first 512 scrambled bits, a split-window continuation, one marker reservation boundary, complete AM values/status/pad, and the resulting carried PRBS state.

- [ ] **Step 2: Write failing continuous-state tests**

```ts
it("matches one-shot scrambling when processed in two windows", () => {
  const whole = scrambleBits(input, initialState);
  const first = scrambleBits(input.slice(0, 313), initialState);
  const second = scrambleBits(input.slice(313), first.state);
  expect(concat(first.bits, second.bits)).toEqual(whole.bits);
  expect(second.state).toEqual(whole.state);
});
```

- [ ] **Step 3: Implement the verified recurrence**

```ts
export function scrambleBits(
  input: Uint8Array,
  predecessorState: ScramblerState,
): { bits: Uint8Array; state: ScramblerState };
```

Name the state `predecessorState` to avoid implying a hardware reset seed. Never reset per block or render window.

- [ ] **Step 4: Write failing rate-match policy tests**

Assert the ceiling-cadence reservation formula, FEC-pair alignment, earliest eligible Idle selection, stable tie-breaking, frame-data protection, maximum deferral failure, and exact per-deletion provenance.

- [ ] **Step 5: Implement `prepareStream` before encoding affected words**

```ts
export function prepareStream(
  input: InterfaceStream,
  policy: RateMatchPolicy,
  absoluteStreamBlock: number,
): Result<PreparedStream>;
```

Delete only eligible Idles, regenerate affected 66-bit and 257-bit groups, and return the immutable ledger. Derive counts from the ledger.

- [ ] **Step 6: Write failing marker tests**

Assert exact AM lane values, status bits, fixed pad, PRBS9 pad order, reservation size, insertion boundary, and that marker bits are neither transcoded nor scrambled.

- [ ] **Step 7: Implement marker scheduling and insertion**

```ts
export function planMarkers(
  blocks: readonly Block257[],
  policy: RateMatchPolicy,
  phase: MarkerPhase,
): Result<MarkerPlan>;

export function insertMarkers(
  scrambled: Uint8Array,
  plan: MarkerPlan,
  state: MarkerPrbsState,
): Result<MarkerResult>;
```

- [ ] **Step 8: Run and commit**

Run:

```powershell
npm exec vitest run test/inspector-pcs.test.ts test/inspector-scramble-markers.test.ts
npm run typecheck
```

Commit: `feat: schedule verified alignment marker windows`

---

### Task 5: Integrate RS orientation, Clause 119 distribution, and 16 PCS lanes

**Files:**
- Create: `src/inspector/engine/distribute.ts`
- Modify: `src/inspector/engine/rs544.ts`
- Modify: `src/inspector/engine/referenceTables.ts`
- Create: `test/inspector-distribution.test.ts`
- Add fixture: `test/fixtures/inspector/ieee-8023-2022-119a-400g-idle-am.json`
- Create or modify: `scripts/inspector-reference.py`

**Interfaces:**
- Consumes: exactly 10,280 `tx_scrambled_am` bits per FEC pair.
- Produces: two 514-symbol messages, two IEEE-oriented 544-symbol codewords, 1,088 checkerboard symbols, and sixteen 68-symbol PCS lanes.

- [ ] **Step 1: Independently transcribe and verify Annex 119A**

The fixture records source table hashes, predecessor scrambler state, marker PRBS state, status, input bit direction, message symbols, codewords, lane symbols, independent script revision, reviewer, and artifact SHA-256.

- [ ] **Step 2: Write failing pre-FEC packing tests**

```ts
it("packs alternating 10-bit A and B symbols with IEEE orientation", () => {
  const { messageA, messageB } = splitFecMessages(sourceBits);
  expect(messageA[0]).toBe(expectedA513);
  expect(messageB[0]).toBe(expectedB513);
  expect(messageA).toHaveLength(514);
  expect(messageB).toHaveLength(514);
});
```

Use temporal arrays where index 0 is the first symbol passed to the encoder. Document the adapter between that representation and IEEE coefficient names.

- [ ] **Step 3: Implement packing and the RS orientation adapter**

```ts
export function splitFecMessages(bits: Uint8Array): FecMessagePair;
export function encodeClause119Codeword(message: Uint16Array): Uint16Array;
```

Reject every input length except 10,280 bits. Do not shorten or zero-pad.

- [ ] **Step 4: Write failing checkerboard tests**

Assert group `k=0` maps A/B without swapping and group `k=1` swaps ownership. Assert lane 0 starts `A543, B535, A527, B519` and lane 1 starts `B543, A535, B527, A519` using unique synthetic symbols.

- [ ] **Step 5: Implement the exact verified permutation**

```ts
export function interleaveClause119(
  codewordA: Uint16Array,
  codewordB: Uint16Array,
): Uint16Array;

export function distributePcsLanes(
  interleaved: Uint16Array,
): readonly Uint16Array[];
```

Restart `k` at zero for every codeword pair. Each lane receives 68 symbols. Serialize bit 0 first only after the verified line check confirms that convention.

- [ ] **Step 6: Verify production against Annex and independent Python**

Compare every message symbol, parity symbol, interleaved output symbol, lane symbol, and first-transmitted bit. A production round trip is not sufficient.

- [ ] **Step 7: Run and commit**

Run:

```powershell
npm exec vitest run test/inspector-fec.test.ts test/inspector-distribution.test.ts
npm run typecheck
```

Commit: `feat: distribute Clause 119 FEC lanes`

---

### Task 6: Add the named reference PMA mapping and PAM4 values

**Files:**
- Create: `src/inspector/engine/pma.ts`
- Create: `src/inspector/engine/pam4.ts`
- Modify: `src/inspector/profiles.ts`
- Create: `test/inspector-pma.test.ts`
- Add fixture: `test/fixtures/inspector/reference-pma-16x4-v1.json`
- Modify: `scripts/inspector-reference.py`

**Interfaces:**
- Consumes: sixteen continuous PCS bit streams plus `PmaMappingProfile` and absolute output-bit phase.
- Produces: four PMD bit streams, dibits, symbol labels, normalized levels, and carried phase.

- [ ] **Step 1: Freeze the reference mapping fixture independently**

Use sixteen nontrivial PCS streams whose lane number and bit time are recoverable from each value. Record the first 64 output bits on every PMD lane, every dibit, normalized level, start/end phase, script hash, and reviewer.

- [ ] **Step 2: Write failing PMA phase tests**

```ts
it("preserves the mux phase across window boundaries", () => {
  const whole = mapPhysicalLanes(pcs, profile, 0);
  const first = mapPhysicalLanes(slicePcs(pcs, 0, 13), profile, 0);
  const second = mapPhysicalLanes(slicePcs(pcs, 13), profile, first.nextAbsoluteBit);
  expect(joinLanes(first.lanes, second.lanes)).toEqual(whole.lanes);
});
```

- [ ] **Step 3: Implement exact schedule mapping**

```ts
export function mapPhysicalLanes(
  pcs: readonly Uint8Array[],
  profile: PmaMappingProfile,
  absoluteOutputBit: number,
): PhysicalLaneResult;
```

At PMD lane `p` and output time `t`, use phase `(initialPhase + absoluteOutputBit + t) % periodBits` and select the corresponding PCSL. Reject mismatched lane lengths and incomplete schedules.

- [ ] **Step 4: Write failing PAM4 tests**

Assert the declared first-bit significance, exact maps `00 -> -3`, `01 -> -1`, `11 -> 1`, `10 -> 3`, odd-bit rejection, no implicit reset, and no measured-unit label.

- [ ] **Step 5: Implement PAM4 conversion**

```ts
export function mapPam4(
  bits: Uint8Array,
  profile: PmaMappingProfile,
): Pam4Result;
```

The initial profile uses `precoder.mode === "none"`. Reject any other mode until its recurrence and state contract have their own reviewed fixture.

- [ ] **Step 6: Add profile copy and provenance**

Use `400gbase-dr4-tx-reference-pma-v1` and the visible label `400GBASE-DR4 with reference 16-to-4 PMA mapping`. Explain that IEEE permits other conformant PMA orders.

- [ ] **Step 7: Run and commit**

Run `npm exec vitest run test/inspector-pma.test.ts && npm run typecheck`.

Commit: `feat: add reference DR4 PMA mapping`

---

### Task 7: Compose a bounded run with traceable provenance

**Files:**
- Create: `src/inspector/engine/run.ts`
- Create: `src/inspector/engine/trace.ts`
- Modify: `src/inspector/types.ts`
- Create: `test/inspector-run.test.ts`
- Add fixture: `test/fixtures/inspector/default-frame-reference-pma-v1.json`

**Interfaces:**
- Consumes: validated `FrameInput`, `StreamConfig`, `RateMatchPolicy`, selected calculation profile, and optional `PmaMappingProfile`.
- Produces: one immutable `InspectorRun` with snapshots, trace edges, states, policies, provenance, and bounded outputs.

- [ ] **Step 1: Freeze one independent end-to-end fixture**

The fixture records MAC bytes, CDMII/control masks, 66-bit blocks, 257-bit blocks, scrambler states, AM plan, deletion ledger, messages, codewords, PCS lanes, reference PMD lanes, PAM4 values, absolute phases, and hashes.

- [ ] **Step 2: Write failing run-bound tests**

Assert exact-bound acceptance, one-bit-over rejection before large allocation, legal trailing completion, no frame truncation, and no partial FEC pair.

- [ ] **Step 3: Implement deterministic size estimation**

```ts
export function estimateRunSize(input: RunInput): Result<RunSize>;
export function buildInspectorRun(input: RunInput): Result<InspectorRun>;
```

Call `estimateRunSize` first. Compare total coded bits across lanes to `MAX_CODED_BITS` before allocating any stage buffers.

- [ ] **Step 4: Compose transformations in the verified order**

The order is: MAC, finite interface stream, rate-match preparation, 64B/66B encode, 256B/257B transcode, one continuous scramble, AM insertion, pre-FEC distribution, RS encode, checkerboard interleave, 16 PCS lanes, selected PMA mapping, PAM4.

- [ ] **Step 5: Build trace edges at every boundary**

Use half-open `DataRef` spans. Record copied, encoded, depends-on, and inserted relationships. AM outputs reference both their fixed source record and PRBS predecessor state; parity references all 514 message symbols.

- [ ] **Step 6: Verify against the frozen fixture**

Compare stage hashes plus selected boundary windows and state objects. Do not regenerate expected values during the test.

- [ ] **Step 7: Run and commit**

Run:

```powershell
npm exec vitest run test/inspector-run.test.ts
npm test
npm run typecheck
```

Commit: `feat: compose traceable inspector runs`

---

### Task 8: Add worker execution and feature-complete stage views

**Files:**
- Create: `src/inspector/workerProtocol.ts`
- Create: `src/inspector/inspector.worker.ts`
- Create: `src/inspector/useInspectorRun.ts`
- Modify: `src/inspector/components/FrameInspector.tsx`
- Create: `src/inspector/components/StageRail.tsx`
- Create: `src/inspector/components/StageWorkspace.tsx`
- Create: `src/inspector/components/DataWindow.tsx`
- Create: `src/inspector/components/FieldDetails.tsx`
- Create: `src/inspector/components/LaneView.tsx`
- Create: `src/inspector/components/Pam4View.tsx`
- Modify: `src/inspector/inspector.css`
- Create: `test/inspector-worker.test.ts`
- Create: `test/inspector-workspace.test.tsx`

**Interfaces:**
- Consumes: `buildInspectorRun` and immutable snapshots.
- Produces: cancellable worker-backed runs and synchronized before/after, lane, PAM4, trace, and provenance views.

- [ ] **Step 1: Write failing worker protocol tests**

Assert monotonic request IDs, stale response rejection, worker error normalization, cleanup on unmount, and no partial previous run after a new Apply.

- [ ] **Step 2: Implement worker protocol and hook**

```ts
type WorkerRequest = { type: "calculate"; requestId: number; input: RunInput };
type WorkerResponse =
  | { type: "result"; requestId: number; run: InspectorRun }
  | { type: "error"; requestId: number; message: string };
```

- [ ] **Step 3: Write failing stage-workspace tests**

Assert all nine stages, actual selected values, offsets, source/output highlighting, stage-specific provenance, unavailable reasons, and separate reference-PMA badge.

- [ ] **Step 4: Implement bounded data windows**

Render only the requested slice, keep selection by absolute index, show total length, and provide deterministic previous/next window controls. Do not place complete codewords or marker periods into the DOM.

- [ ] **Step 5: Implement PCS, lane, and PAM4 views**

PCS lanes show lane identity, absolute symbol index, 10-bit value, and bit-zero-first serialization. PMD lanes show the selected source PCSL and mux phase. PAM4 shows dibit, symbol label, and normalized level with no voltage/power units.

- [ ] **Step 6: Preserve walkthrough navigation**

Entering the inspector from a walkthrough step retains `from=frame`, direction, and step. Returning restores the exact walkthrough stage. Inspector keyboard handling must not steal walkthrough keys while hidden.

- [ ] **Step 7: Run and commit**

Run:

```powershell
npm exec vitest run test/inspector-worker.test.ts test/inspector-workspace.test.tsx test/inspector-navigation.test.ts
npm test
npm run build
```

Commit: `feat: complete interactive PHY inspector views`

---

### Task 9: Perform browser verification, accessibility checks, and review handoff

**Files:**
- Create: `e2e/inspector.spec.ts`
- Create or modify: `playwright.config.ts`
- Create: `docs/inspector-review.md`
- Modify: `README.md`
- Modify tests as required by verified defects only.

**Interfaces:**
- Consumes: the completed branch.
- Produces: browser evidence, accessibility evidence, fixture/provenance audit, and a review-ready branch.

- [ ] **Step 1: Add Playwright only if it is not already configured**

Install as a development dependency and configure the existing Vite dev server. Do not add a production dependency.

- [ ] **Step 2: Write end-to-end cases**

Cover direct inspector URL, header entry, walkthrough entry and exact return, edit without Apply, Apply and worker completion, rapid double Apply, browser Back/Forward, stage deep link, reference-PMA provenance, unsupported profile state, keyboard ownership, and mobile viewport.

- [ ] **Step 3: Run automated browser checks**

```powershell
npm test
npm run typecheck
npm run build
npx playwright test e2e/inspector.spec.ts
git diff --check
```

- [ ] **Step 4: Perform accessibility verification**

Check keyboard order, visible focus, dialog-free navigation, selected-stage announcement, form labels, error association, table/list semantics, contrast, reduced motion, and 200 percent zoom. Record failures and fixes in `docs/inspector-review.md`.

- [ ] **Step 5: Audit provenance and capability claims**

Confirm every calculated stage names its source or selected policy, the IEEE-only profile does not claim a universal PMA sequence, reference mapping labels remain visible, fixture hashes match, and unsupported tuples cannot start a run.

- [ ] **Step 6: Request a fresh code review**

Review the complete branch against this plan and the spec. Fix every correctness, provenance, accessibility, and stale-state finding, then rerun the full command set.

- [ ] **Step 7: Commit documentation and evidence**

Commit: `docs: record PHY inspector verification`

## Dependency Order and Stop Conditions

```mermaid
flowchart LR
  T1[Task 1 final source check] --> T2[Task 2 contracts]
  T2 --> T3[Task 3 PCS blocks]
  T3 --> T4[Task 4 scramble and markers]
  T4 --> T5[Task 5 FEC and PCS lanes]
  T5 --> T6[Task 6 reference PMA and PAM4]
  T6 --> T7[Task 7 complete run]
  T7 --> T8[Task 8 worker and views]
  T8 --> T9[Task 9 browser and review]
```

Stop execution if any of these conditions occurs:

- A required final IEEE rule cannot be lawfully inspected or differs materially from the retained candidate.
- Annex 119A cannot be transcribed and independently reviewed with stable hashes.
- The independent reference disagrees with production at any boundary.
- Rate matching would remove frame data, violate the verified boundary, or exceed maximum deferral.
- A run cannot complete a FEC pair within `MAX_CODED_BITS`.
- A physical/PAM4 view lacks a selected `PmaMappingProfile` or loses absolute mux phase.

When stopped, retain the already verified lower stages, keep later stages unavailable with a precise reason, and do not enable the complete profile.

## Final Acceptance Checklist

- [ ] Every Task 1 rule record has a final source, exact locator, convention, reviewer, and verified status.
- [ ] Every expected vector is frozen, hashed, independently produced, and never regenerated by production code in tests.
- [ ] CDMII, 66b, 257b, scrambling, AM, FEC, PCS-lane, PMA, and PAM4 boundaries match their fixtures.
- [ ] Windowed execution equals one-shot execution for every stateful stage.
- [ ] The reference PMA mapping is visibly distinguished from IEEE-derived PCS behavior.
- [ ] The original walkthrough remains unchanged and restores its exact prior step.
- [ ] Full tests, typecheck, build, Playwright, accessibility review, and `git diff --check` pass.
- [ ] A fresh reviewer approves the complete branch with no unresolved correctness or provenance findings.

