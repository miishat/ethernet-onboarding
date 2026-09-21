# Interactive Frame Inspector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional, inspectable Ethernet transmit calculation workspace with real values while preserving the guided "Follow a frame" experience and its return position.

**Architecture:** Keep pure protocol transformations in `src/inspector/engine`, presentation in `src/inspector/components`, and navigation in the existing URL-state system. Compute a deterministic, bounded 400GBASE-DR4 TX run from editable MAC input plus explicit stream state; expose indexed snapshots and trace relationships through a worker-backed controller. The existing walkthrough remains a separate view with contextual entry and return actions.

**Tech Stack:** React 18, TypeScript strict mode, Vite, typed arrays, native Web Worker, existing CSS/palette tokens, Vitest; add Testing Library/jsdom and Playwright as development-only dependencies when their tasks need them.

**Spec:** `docs/superpowers/specs/2026-09-18-interactive-frame-inspector.md`. Read both documents. The spec separates user requirements from the plan's proposed initial profile and scope decisions.

## Global Constraints

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

## Starting point and execution order

Planning inspection on 2026-09-18 found `main` at `1427615`, with unrelated changes in `src/components/TopicExplorer.tsx`, `src/styles/global.css`, `test/topic-explorer.test.ts`, and untracked `.planning/`, `vite.log`, and `vite-error.log`. Recheck at execution time. Do not stash, discard, copy, or commit those changes as part of this feature. The current working copy's modal search implementation may differ from the clean branch, so inspect the isolated checkout before integrating keyboard behavior.

Current architecture:

- `src/App.tsx` chooses stack versus walkthrough with `stepping`; it also owns a global Escape listener.
- `src/components/Stepper.tsx` has its own global arrow/Escape listener and nine stages per direction.
- `src/navigation/urlState.ts` serializes topic, rate, direction, lane generation, walkthrough state, and step.
- `src/data/stepper.ts` contains stable TX IDs: `frame`, `encode`, `transcode`, `scramble`, `am`, `fec`, `stripe`, `serialise`, `pam4`; RX has separate IDs.
- `StageArt.tsx` and current diagrams illustrate concepts. They are not encoders and must not serve as computation oracles.
- `vitest.config.ts` currently includes only `test/**/*.test.ts`; most existing component tests use server rendering.

Deliver in three reviewable milestones within one feature branch:

1. **Tasks 1 through 5:** sourced contracts, actual MAC values, navigation, and independent inspector shell. Downstream stages visibly unavailable until implemented.
2. **Tasks 6 through 10:** independently verified PCS/FEC/PMA/PAM4 computation.
3. **Tasks 11 through 15:** worker integration, detailed views, walkthrough integration, browser verification, and review handoff.

Task 2's protocol evidence blocks Tasks 6 through 10, but not MAC calculations or navigation. These are dependency boundaries, not permission gates. Do not report the whole feature complete after milestone 1.

### Research update: 2026-09-21

Read `docs/inspector-source-research-2026-09-21.md` before dispatching Tasks 6 through 10. IEEE Xplore document 9844436 offers IEEE Std 802.3-2022 through the IEEE Reading Room, but the Reading Room requires account sign-in and this research session was unauthenticated. Do not use or endorse a third-party mirror of copyrighted standard text as final production authority. The evidence changes the execution plan as follows:

- Tasks 6 and 7 are conditionally specified, not final-profile-ready. Their Clause 119 candidates need a lawful IEEE line check and independently admitted fixtures before implementation may supply `400gbase-dr4-tx-v1` values.
- Task 8 is split into 8a and 8b. Task 8a may implement a standalone RS(544,514) primitive from final ITU-T G.709.5 Corrigendum 1 evidence. Task 8b has high-confidence candidate pre-FEC, interleave and PCS-lane formulas, but needs the same final Clause 119 line check, an explicit RS-orientation adapter and an Annex 119A fixture before integration.
- Remove the assumed round-robin interleave assertion. Final ITU-T evidence independently says IEEE 119.2.4.7 is 10-bit and non-round-robin, while deferring the exact mapping to IEEE.
- AM Idle deletion is implementation-owned. Before a finite default stream can exist, select `RateMatchPolicy` with eligible Idles, selection/deferral rules, frame-boundary behaviour, phase semantics and deletion trace.
- Task 9 requires a fully populated implementation-specific `PmaMappingProfile`. IEEE permits multiple valid 16-to-4 orders. OIF/CMIS Gray labels and no-precoding evidence may be used only under their stated selected-module scope.
- Task 10 remains blocked until Tasks 6, 7 and 8b are final-line-checked, `RateMatchPolicy` and any `PmaMappingProfile` are selected, and a complete independent 400G fixture exists.
- `getProfileSupport("400G", "tx", "100")` stays false. Completion of Task 8a or a candidate-only adapter must not enable it.

## File ownership and responsibilities

| Path | Responsibility |
|---|---|
| `src/inspector/types.ts` | Frame input, stages, profile ID, typed calculation results, snapshot and trace contracts. |
| `src/inspector/profiles.ts` | Explicit supported profile and capability checks. |
| `src/inspector/defaults.ts` | Deterministic sample and stream initialization. |
| `src/inspector/stageMap.ts` | Stable walkthrough-to-inspector mapping, including RX counterpart labels. |
| `src/inspector/engine/validation.ts`, `mac.ts`, `crc32.ts` | Validate user input; construct and protect a MAC frame. |
| `src/inspector/engine/bits.ts`, `stream.ts` | Explicit bit order and finite CDMII stream construction. |
| `src/inspector/engine/encode66.ts`, `transcode257.ts`, `scramble.ts` | Separate PCS transformations. |
| `src/inspector/engine/markers.ts`, `distribute.ts` | Marker scheduling, pre-FEC distribution, post-FEC striping. |
| `src/inspector/engine/gf1024.ts`, `rs544.ts` | Field arithmetic and systematic RS encoder. |
| `src/inspector/engine/pma.ts`, `pam4.ts` | Verified physical lane mapping and symbol mapping. |
| `src/inspector/engine/run.ts`, `trace.ts` | Compose stages; index provenance and dependency edges. |
| `src/inspector/engine/referenceTables.ts` | Published profile constants with source references, not UI data. |
| `src/inspector/inspector.worker.ts`, `workerProtocol.ts`, `useInspectorRun.ts` | Async execution, stale response handling, lifecycle. |
| `src/inspector/components/FrameInspector.tsx` | Inspector layout and local orchestration. |
| `src/inspector/components/FrameEditor.tsx` | Draft fields, validation, explicit Apply. |
| `src/inspector/components/StageRail.tsx`, `StageWorkspace.tsx` | Stage navigation and synchronized before/after view. |
| `src/inspector/components/DataWindow.tsx`, `FieldDetails.tsx` | Bounded value windows, selection, exact offsets. |
| `src/inspector/components/LaneView.tsx`, `Pam4View.tsx` | Actual lane data and indexed normalized symbols. |
| `src/inspector/inspector.css` | Scoped responsive styling using existing tokens. |
| `src/navigation/urlState.ts`, `documentTitle.ts`, `useUrlNavigation.ts` | Backward-compatible inspector routes and browser history. |
| `src/App.tsx`, `src/components/Header.tsx`, `src/components/Stepper.tsx` | Entry/exit wiring and keyboard ownership. |
| `test/inspector-*.test.ts`, `test/inspector-*.test.tsx` | Protocol, controller, and interaction tests. |
| `test/fixtures/inspector/` | Frozen independent input/output vectors and source manifest. |
| `scripts/inspector-reference.py` | Offline independently authored reference pipeline for custom-frame fixtures. |
| `e2e/inspector.spec.ts`, `playwright.config.ts` | Real browser history, worker, keyboard, and layout coverage. |
| `docs/inspector-profile.md`, `docs/inspector-review.md`, `README.md` | Protocol contract, review evidence, feature guidance. |

Do not move or refactor unrelated content, diagram, or search modules. The new feature's styles belong in its own stylesheet to reduce conflicts with existing UI work.

Test snippets below are focused cases, not whole files. Use `import {describe, it, expect, vi} from 'vitest'` for the identifiers each test actually uses, import the task's exported functions/types from their named modules, and load frozen JSON vectors from `test/fixtures/inspector/`. Interaction tests additionally import `render`, `screen`, and `cleanup` from Testing Library and `userEvent` from its package, with `afterEach(cleanup)`. Define `onSelect` as `vi.fn()` and use a verified full-run fixture for `verifiedRun`. No assertion may generate its own expected output by calling the function under test.

## Task 1: Isolate the review branch and establish a clean baseline

**Files:** Copy only this plan and its spec into the isolated checkout if they are not yet committed. No application edits.

**Interfaces:** Consumes the repository's current HEAD; produces an isolated checkout on `codex/interactive-frame-inspector` with recorded baseline results.

- [ ] Read `superpowers:using-git-worktrees` at execution time. Check current branch, status, remotes, and whether the named branch already exists.

```powershell
git -c safe.directory=C:/Users/misha/ethernet-onboarding status --short
git -c safe.directory=C:/Users/misha/ethernet-onboarding branch --list codex/interactive-frame-inspector
git -c safe.directory=C:/Users/misha/ethernet-onboarding check-ignore .worktrees
```

- [ ] Create a managed worktree using the app tool when available; create/switch to `codex/interactive-frame-inspector` inside that checkout. CLI fallback, only if the branch does not exist:

```powershell
git -c safe.directory=C:/Users/misha/ethernet-onboarding worktree add .worktrees/interactive-frame-inspector -b codex/interactive-frame-inspector HEAD
```

If the branch exists, inspect its owning worktree and resume it instead of force-resetting. Use the returned absolute path for every subsequent command. Apply a command-local safe-directory option if needed; do not change global Git trust configuration.

- [ ] Copy only the two planning documents into the checkout, preserving real newlines. Run `npm ci`, `npm test`, and `npm run build`. Record pre-existing failures separately and do not claim they were introduced by this feature.
- [ ] Commit only the plan/spec with `git commit -m "docs: plan interactive frame inspector"`. Confirm the source working tree's unrelated changes still exist. Do not use `git add .`.

## Task 2: Freeze the computation contract and independent vector strategy

**Files:** Create `docs/inspector-profile.md`, `src/inspector/types.ts`, `profiles.ts`, `defaults.ts`, `engine/referenceTables.ts`, `test/fixtures/inspector/manifest.json`, `test/inspector-profile.test.ts`.

**Interfaces:** Produces `PROFILE`, `DEFAULT_FRAME`, `DEFAULT_STREAM`, and the shared types below. `getProfileSupport(rate, dir, gen)` returns `{supported:boolean; reason:string}`. Until every verification gate in this plan passes, it returns `supported: false` for every tuple, including 400G/TX/100G-per-lane. Only a later fully verified implementation may make that intended tuple true; every other tuple remains unsupported.

```ts
export type InspectorStage = 'mac' | 'encode66' | 'transcode257' |
  'scramble' | 'markers' | 'fec' | 'pcs-lanes' | 'physical-lanes' | 'pam4';
export type ProfileId = '400gbase-dr4-tx-v1';
export interface FrameDraft {
  destination: string; source: string; etherType: string; payloadHex: string;
}
export interface FrameInput {
  destination: Uint8Array; source: Uint8Array;
  etherType: number; payload: Uint8Array;
}
export type Result<T> = {ok:true; value:T} |
  {ok:false; errors:Partial<Record<keyof FrameDraft | 'profile' | 'run', string>>};
export interface StreamConfig {
  scramblerSeedHex: string; markerPrbsSeed: number;
  markerBlockPhase: number; lanePhase: number; prefixIdleOctets: number;
}
export interface Profile {
  id: ProfileId; label: string; standardEdition: string;
  referenceIds: readonly string[]; pcsLaneCount: number;
  physicalLaneCount: number; baudGBd: number;
}
export interface FrameField {id:string; offset:number; length:number}
export interface MacFrame {
  bytes:Uint8Array; withoutFcs:Uint8Array; fcs:Uint8Array;
  fields:readonly FrameField[]; paddingBytes:number;
}
export interface DataRef {
  stage:InspectorStage; bufferId:string; start:number; count:number;
}
export interface TraceEdge {
  output:DataRef; inputs:readonly DataRef[];
  relation:'copied' | 'encoded' | 'depends-on' | 'inserted';
}
export interface Snapshot {
  stage:InspectorStage; unit:'octet' | 'bit' | 'rs-symbol' | 'pam4-symbol';
  buffers:readonly {id:string; values:Uint8Array | Uint16Array}[];
  inputRefs:readonly DataRef[]; outputRefs:readonly DataRef[];
  explanation:string; referenceIds:readonly string[];
}
export interface InspectorRun {
  id:string; profileId:ProfileId; stream:StreamConfig;
  mac:MacFrame; snapshots:readonly Snapshot[]; trace:readonly TraceEdge[];
}
```

- [ ] Write failing capability tests, including RX and 800G/1.6T rejection. Run `npx vitest run test/inspector-profile.test.ts` and confirm failure is missing implementation.

```ts
expect(getProfileSupport('400G','tx','100').supported).toBe(false);
expect(getProfileSupport('400G','rx','100').supported).toBe(false);
expect(getProfileSupport('800G','tx','100').supported).toBe(false);
expect(getProfileSupport('1.6T','tx','200').supported).toBe(false);
```

- [ ] Complete a lawful IEEE Std 802.3-2022 Reading Room or licensed-copy line check for the applicable MAC, RS/CDMII, PCS, PMA and DR4 rules. Resolve control block tables/start and terminate placement, transcode ordering, bit serialization, scrambler recurrence and shift direction, AM values/pad/status/schedule, pre-FEC distribution, RS orientation, codeword interleave, and PMA/PMD boundary. Record exact clause/table/page/line, source URL, edition and retrieval date. Retained Clause 119 formulas are high-confidence candidates only until this check completes. Existing prose and third-party mirrors are not an oracle.
- [ ] Pin one deterministic initialization only after the final line check accepts the recurrence. The requested 58 one-bit teaching seed, PRBS seed `0x1ff`, marker/lane phase zero and 4,096 prefix Idle count remain teaching metadata, not hardware reset state. Add `RateMatchPolicy` with eligible Idle controls, selection strategy, maximum deferral, frame-boundary rule, AM phase relation and deletion trace. Its product-owned policy determines trailing Idles to complete codeword and lane groups. Cap the inspected result at 262,144 coded bits; reject over-cap requests instead of truncating a frame. Exercise later marker boundaries using phase-controlled windows with carried state and deletion trace rather than storing a full marker period.
- [ ] Freeze `DEFAULT_FRAME` as destination `02:00:00:00:00:02`, source `02:00:00:00:00:01`, EtherType `88B5`, payload bytes `00` through `3F`. Record local experimental payload semantics.
- [ ] Add independent fixture manifest entries with `id`, `sourceUrl`, `edition`, `clause`, `inputState`, `encoding`, `sha256`, and `verificationScope`. Obtain published examples where available. Supplement with separately implemented Python reference results, reviewed against the rules; do not import production TypeScript into that script. Never regenerate expected results during tests. Public 800G vectors may verify a shared RS primitive only after validating conventions.
- [ ] Run the capability tests and commit named files with `feat: define verified inspector profile and contracts` only when its protocol contract is complete. If normative sources are inaccessible, record the specific missing rule and leave this task incomplete; Tasks 3 through 5 can proceed using the MAC subset. Do not invent constants or offer fabricated downstream results.

## Task 3: Construct real MAC frames and calculate CRC-32

**Files:** Create `engine/validation.ts`, `engine/crc32.ts`, `engine/mac.ts`, `test/inspector-mac.test.ts`, and MAC fixtures under `test/fixtures/inspector/`.

**Interfaces:** `parseFrame(draft:FrameDraft):Result<FrameInput>`; `crc32(bytes:Uint8Array):number`; `buildMacFrame(input:FrameInput):MacFrame`.

- [ ] Write tests for known CRC output, complete frame fixtures, zero-padding, payload boundaries, offsets, FCS wire byte order, and single-byte edits.

```ts
expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
const parsed = parseFrame({...DEFAULT_FRAME, payloadHex:''});
if (!parsed.ok) throw new Error('Default input must parse');
const frame = buildMacFrame(parsed.value);
expect(frame.bytes.length).toBe(64);
expect(frame.paddingBytes).toBe(46);
expect(frame.fields.find(f => f.id === 'fcs')).toEqual({id:'fcs',offset:60,length:4});
expect(parseFrame({...DEFAULT_FRAME, payloadHex:'0'}).ok).toBe(false);
expect(parseFrame({...DEFAULT_FRAME, payloadHex:'GG'}).ok).toBe(false);
expect(parseFrame({...DEFAULT_FRAME, payloadHex:'00'.repeat(1501)}).ok).toBe(false);
```

- [ ] Run `npx vitest run test/inspector-mac.test.ts` and observe expected failures.
- [ ] Implement strict MAC parsing (six two-digit hex octets with colon separators), four-digit EtherType in `0600..FFFF`, whitespace-separated or continuous even-length payload hex, 0..1,500 payload bytes, and valid individual source addresses. Accept unicast/multicast/broadcast destination addresses. Return field-specific errors without throwing for user input.
- [ ] Implement the reflected Ethernet CRC primitive:

```ts
export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
```

Construct `DA || SA || EtherType big-endian || payload || zero pad`. Compute FCS over those bytes; append the resulting CRC least-significant octet first. Emit separate payload/pad fields, omitting a zero-length pad. Exclude preamble, SFD, and IPG from the MAC-frame length. Freeze complete expected frame bytes from Python `zlib.crc32`, not just the production CRC function.
- [ ] Re-run tests and `npm run typecheck`. Commit only named files with `feat: calculate editable Ethernet frames and FCS`.

## Task 4: Add backward-compatible inspector navigation

**Files:** Modify `src/navigation/urlState.ts`, `documentTitle.ts`, `src/App.tsx`, existing navigation tests; create `src/inspector/stageMap.ts`, `test/inspector-navigation.test.ts`.

**Interfaces:** Replace `stepping:boolean` with `view:'stack'|'frame'|'inspector'`; add `inspectorStage:InspectorStage` and `inspectorReturn:'stack'|'frame'`. Keep `stepIndex`, `path`, `rate`, `dir`, and `gen`. Export `stageForWalkthrough(id:string):InspectorStage`, `openInspector(state:UrlNavigationState):UrlNavigationState`, and `closeInspector(state:UrlNavigationState):UrlNavigationState` from `stageMap.ts`.

- [ ] Write URL round-trip and return-context tests, retaining existing serialized URLs:

```ts
const before = {...DEFAULT_URL_STATE, view:'frame' as const,
  rate:'800G' as const, dir:'rx' as const, gen:'200' as const, stepIndex:3};
const opened = openInspector(before);
expect(opened.view).toBe('inspector');
expect(opened.inspectorStage).toBe('fec');
expect(closeInspector(decodeUrlState(encodeUrlState(opened)))).toEqual(before);
expect(decodeUrlState('?view=frame&step=4').view).toBe('frame');
```

- [ ] Run the targeted tests and observe failures. Implement explicit `view=inspector`, `inspectStage=fec`, and `from=frame` query parameters; retain existing global query order and spelling. Defaults omit inspector-only parameters outside inspector mode. Invalid stages become `mac`; invalid origins become `stack`. On close reset inspector-only fields to defaults, preserving all source navigation fields. Thus the example equality assertion remains true.
- [ ] Map TX stages by IDs, not numeric index. Map RX counterparts only for selecting the corresponding TX lesson, never for claiming RX computation: `rx-pam4→pam4`, `rx-serialise→physical-lanes`, `rx-align→pcs-lanes`, `rx-fec→fec`, `rx-am→markers`, `rx-descramble→scramble`, `rx-transcode→transcode257`, `rx-decode→encode66`, `rx-frame→mac`.
- [ ] Update `statesEqual`, normalization, title generation, and every `stepping` usage in App/tests to derive `view === 'frame'`. Set default inspector stage to `mac` and return view to `stack`. Keep this task buildable with the route landing panel and return button below until Task 5 adds the editor. This temporary integration state must not display computed PHY values.

```tsx
{navigation.view === 'inspector' ? (
  <main><h1>Frame inspector</h1>
    <button onClick={() => navigate(closeInspector(navigation), 'push')}>
      Return to learning
    </button>
  </main>
) : navigation.view === 'frame' ? walkthrough : stack}
```

Here `walkthrough` and `stack` refer to the existing JSX branches extracted into local variables during this edit, not new components.
- [ ] Entry/explicit return use `push`; changing the inspector stage uses `replace`. Browser Back naturally restores the entry state. A directly opened URL falls back to the encoded origin or stack, never calls `history.back()` blindly. Navigation to a searched topic sets `view:'stack'` and clears inspector-only route fields.
- [ ] Run URL/title/browser-href tests and `npm run build`. Commit `feat: add inspector routes with preserved walkthrough context`.

## Task 5: Deliver an independently usable MAC inspector

**Files:** Create `components/FrameInspector.tsx`, `FrameEditor.tsx`, `StageRail.tsx`, `FieldDetails.tsx`, `inspector.css`, `test/inspector-editor.test.tsx`; modify `src/App.tsx`, `Header.tsx`, `vitest.config.ts`, `package.json` and lockfile.

**Interfaces:** `FrameEditor` consumes `{draft:FrameDraft; onDraftChange:(draft:FrameDraft)=>void; onApply:(input:FrameInput)=>void}`. `FrameInspector` consumes `{stage:InspectorStage; onStageChange:(stage:InspectorStage)=>void; onExit:()=>void; draft:FrameDraft; onDraftChange:(draft:FrameDraft)=>void; mac:MacFrame|null; onApply:(input:FrameInput)=>void}` initially; Task 12 adds the completed-run props. App owns draft/applied state so leaving the inspector does not erase it.

- [ ] Add dev-only `@testing-library/react`, `@testing-library/user-event`, and `jsdom` at compatible versions; include `test/**/*.test.tsx` in Vitest config. Use `// @vitest-environment jsdom` for interaction tests rather than changing existing node tests.
- [ ] Write and run a failing input interaction test:

```tsx
const onApply = vi.fn();
render(<FrameEditor draft={{...DEFAULT_FRAME,payloadHex:'GG'}}
  onDraftChange={vi.fn()} onApply={onApply}/>);
await userEvent.click(screen.getByRole('button',{name:'Apply frame'}));
expect(onApply).not.toHaveBeenCalled();
expect(screen.getByRole('alert').textContent).toMatch(/hex/i);
```

- [ ] Implement native labeled fields, field-specific errors, an Apply action, and an optional Reset sample button that edits the draft only. Do not recompute or change the displayed applied frame on every keystroke. Show "Unapplied edits" while draft and applied values differ. Render MAC input/output blocks from field offsets and lengths, with exact byte counts, FCS, hex bytes, and selected-field details.
- [ ] Use the mockup composition and existing theme tokens. Add a visible profile label and "TX example" context. The nine-stage rail exists, but incomplete stages show "Calculation not available yet" during implementation and never simulated numbers. Add the standalone Header entry without removing the walkthrough button.
- [ ] Ensure fields are native buttons, selection uses `aria-pressed`, keyboard focus remains visible, dynamic summaries use `aria-live="polite"`, and panel layout stacks below 760px. Only the byte table may scroll internally; the page must not overflow horizontally.
- [ ] Test valid Apply changes FCS, invalid Apply preserves previous output, selecting payload/FCS updates details, and exit/reentry keeps the draft. Run `npx vitest run test/inspector-editor.test.tsx test/inspector-mac.test.ts` and `npm run build`; commit `feat: add editable MAC frame inspector`.

## Task 6: Encode a finite interface stream and transcode it

**Research gate:** Do not start final-profile code or fixtures until the IEEE Reading Room or licensed-copy check resolves Clause 117, Clause 82 and 119.2.4.2. Candidate formulas are useful for making the verification fixture plan precise, not for bypassing that check.

**Files:** Create `engine/bits.ts`, `stream.ts`, `encode66.ts`, `transcode257.ts`, `scripts/inspector-reference.py`, `test/inspector-pcs.test.ts`, PCS fixtures. Add sourced encoding/transcoding tables to `referenceTables.ts`.

**Interfaces:** `buildInterfaceStream(frame:MacFrame, config:StreamConfig):InterfaceWord[]`; `encode66(words:readonly InterfaceWord[]):EncodedBlock[]`; `transcode257(blocks:readonly EncodedBlock[]):TranscodedBlock[]`. Add shared types: `InterfaceWord={octets:Uint8Array; controlMask:number; frameOffsets:Int32Array}`, `EncodedBlock={bits:Uint8Array; sourceWord:number}`, `TranscodedBlock={bits:Uint8Array; sourceBlocks:readonly number[]}`. Each interface word has eight octets; controlMask bit i describes octet i; frameOffsets uses -1 for non-frame octets. Uint8Array bits are stored in time order, values 0/1.

- [ ] Freeze independent fixtures for all-data, idle, supported start placement, every generated termination position, mixed data/control transcode groups, and frame sizes spanning group boundaries. Each fixture includes expected CDMII/control octets, 66-bit blocks, and 257-bit blocks. Write:

```ts
for (const vector of pcsVectors) {
  const words = buildInterfaceStream(vector.frame, vector.stream);
  expect(encode66(words).map(b => Array.from(b.bits))).toEqual(vector.blocks66);
  expect(transcode257(encode66(words)).map(b => Array.from(b.bits)))
    .toEqual(vector.blocks257);
}
```

- [ ] Run `npx vitest run test/inspector-pcs.test.ts` and confirm failure. Implement serialized-bit helpers with explicit names such as `octetsToLsbFirstBits`, and documented transcode packing functions where standard field order differs. Do not assume every hex field prints in wire order.
- [ ] Construct an actual finite interface stream containing prefix idles, Start/preamble/SFD as specified at the interface, MAC bytes, Terminate, and trailing idles. Pad with valid idle traffic to a complete transcode/FEC boundary; never append arbitrary zero bits to the stream. Implement the supported data/control block tables and 4-to-1 transcoding from the verified contract. Throw a named internal error for a control pattern not supported by the sample generator, rather than encoding it as data.
- [ ] Extend the independently authored reference script to produce the same deterministic case set without importing TS code or runtime tables. Compare complete fixtures, not only lengths or encode/decode round trips. Verify headers/control semantics independently before accepting a mismatch as a fixture bug.
- [ ] Run targeted tests and typecheck; commit `feat: encode and transcode reproducible frame streams`.

## Task 7: Scramble and schedule alignment markers correctly

**Research gate:** Do not start final-profile code or fixtures until the Clause 49/119.2.4.3-4 Reading Room or licensed-copy check succeeds. `RateMatchPolicy` is mandatory because the individual legal Idle deletion locations are implementation-owned.

**Files:** Create `engine/scramble.ts`, `markers.ts`, `test/inspector-scramble-markers.test.ts`; extend reference script, tables, and fixtures.

**Interfaces:** `scramble(bits:Uint8Array, seedHex:string):{bits:Uint8Array; finalSeedHex:string}`; `prepareStream(frame:MacFrame, config:StreamConfig):PreparedStream`; `insertMarkers(scrambled:Uint8Array, plan:MarkerPlan, config:StreamConfig):MarkerResult`.

Add `RateMatchPolicy={id:string; eligibleIdleEncodings:readonly IdleEncoding[]; selectionStrategy:string; maximumDeferralBlocks:number; frameBoundaryRule:string}` and `RateMatchDeletion={originalPosition:{wordIndex:number;octetIndex:number;bitOffset:number}; encoding:IdleEncoding; policyId:string; reason:'alignment-marker-reservation'|'trailing-fec-completion'; markerReservation:{groupIndex:number;insertionBitOffset:number;fecPairIndex:number;boundary:'before-fec-pair'|'trailing-completion'}}`, where `IdleEncoding={octets:Uint8Array;controlMask:number}`. Add `MarkerPlan={insertionBitOffsets:readonly number[]; rateMatchLedger:readonly RateMatchDeletion[]; finalPhase:number}`, `PreparedStream={words:readonly InterfaceWord[]; markerPlan:MarkerPlan; rateMatchLedger:readonly RateMatchDeletion[]}`, and `MarkerResult={bits:Uint8Array; markers:readonly {bitOffset:number;bitLength:number}[]; rateMatchLedger:readonly RateMatchDeletion[]; finalPhase:number}`. The ledger, not a `removedIdleOctets` aggregate, is the authoritative record. An aggregate count may be derived only for display. Offsets in `MarkerPlan` are positions in the scrambled stream before insertion, in ascending order. Marker insertion consumes already scrambled bits and a precomputed plan; it cannot infer deletable Idle locations from scrambled bits.

- [ ] Freeze scrambler vectors including zero input, varied input, and chunk boundaries; marker vectors cover before/at/after insertion, final phase, pad sequence, status bits, and every `RateMatchDeletion` field. Include more than one eligible Idle and assert the selected original position/encoding, policy/reason and marker-reservation boundary, not only a deletion count. Write:

```ts
const result = scramble(Uint8Array.from(scrambleVector.input), scrambleVector.seedHex);
expect(Array.from(result.bits)).toEqual(scrambleVector.output);
const first = scramble(Uint8Array.from(scrambleVector.input.slice(0,137)), scrambleVector.seedHex);
const second = scramble(Uint8Array.from(scrambleVector.input.slice(137)), first.finalSeedHex);
expect([...first.bits,...second.bits]).toEqual(scrambleVector.output);
```

- [ ] Run the targeted test red. Implement the verified x^58+x^39+1 recurrence with a 58-bit state using BigInt or split words, not JavaScript 32-bit shifts for the entire register. Include every specified transcoded bit. Distinguish input versus output feedback explicitly in comments and fixtures.
- [ ] Implement `prepareStream` in `stream.ts` using `buildInterfaceStream` and explicit idle-removal candidates from generator metadata. Decide idle compensation before encoding affected words, preserve legal IPG/start alignment, and regenerate those words. Return compensated interface words plus the removed-idle ledger and marker plan. Concatenate transcoded block bits and scramble the continuous stream once; do not reset the scrambler per block. Insert markers after scrambling using the plan and verified PRBS9 pad. Do not scramble AM bits or increase the stream rate by simply appending uncompensated overhead. Task 10 must call `prepareStream`, not the uncompensated builder.
- [ ] Verify a marker-containing and marker-free window against the reference model, plus phase transitions across consecutive windows. Use a numeric phase jump for boundary tests, with documented seed/PRBS state, rather than allocating a full marker period.
- [ ] Run `npx vitest run test/inspector-scramble-markers.test.ts test/inspector-pcs.test.ts` and typecheck; commit `feat: calculate scrambling and alignment marker windows`.

## Task 8: Calculate standalone RS parity; conditionally prepare Ethernet distribution

**Files for 8a:** Create `engine/gf1024.ts`, `rs544.ts`, `test/inspector-fec.test.ts`; extend reference tables and standalone RS fixtures. **Conditional 8b files:** `engine/distribute.ts`, `test/inspector-lanes.test.ts`, and Ethernet distribution fixtures, only after the final Clause 119 line check and Annex 119A fixture access.

**8a interfaces:** `gfMultiply(a:number,b:number):number`; `encodeRs544(message:Uint16Array):Uint16Array`. **Conditional 8b interfaces:** `splitFecMessages(bits:Uint8Array):readonly [Uint16Array,Uint16Array][]`; `interleaveCodewords(a:Uint16Array,b:Uint16Array):Uint16Array`; `distributePcs(symbols:Uint16Array):readonly Uint16Array[]`. The complete FEC-pair boundary fixes lane zero; a render window may not alter protocol phase with `initialLane`.

- [ ] Write tests using independently sourced 514-symbol messages and expected 544-symbol codewords. Include nonzero data; the zero-codeword test alone is insufficient. Verify the 30 parity symbols exactly, complete codeword order, primitive field identities, and rejection of lengths other than 514 or symbols outside 0..1023.

```ts
expect(Array.from(encodeRs544(Uint16Array.from(rsVector.message))))
  .toEqual(rsVector.codeword);
expect(() => encodeRs544(new Uint16Array(513))).toThrow(/514/);
```

- [ ] Run 8a tests red. Implement GF arithmetic using ITU-T G.709.5 (2024) Corrigendum 1 Annex A: GF(2^10), primitive polynomial `x^10 + x^3 + 1`, roots alpha^0 through alpha^29, 514 information symbols, 30 parity symbols, and the documented systematic output order. Use a separate polynomial-arithmetic reference to verify production lookup tables.
- [ ] Use a nonzero standalone 514-symbol input and frozen expected 544-symbol output generated by an independently reviewed reference implementation. Record the reference revision, exact input convention, artifact hash, and source scope. The fixture must not be described as an Ethernet stream or a `400gbase-dr4-tx-v1` output.
- [ ] Validate primitive identities, exact parity, full output order, invalid message lengths, and symbols outside 0..1023. Run focused tests and typecheck; commit `feat: add standalone RS544 arithmetic`.
- [ ] Keep 8b conditionally blocked. Before implementation, check final IEEE 119.2.4.5 through 119.2.4.8 through the Reading Room or licensed copy, record the candidate-formula comparison, and access Annex 119A Tables 119A-2, 119A-5 and 119A-6 lawfully. Then freeze a separate constant-Idle/AM fixture, write an RS-orientation adapter test, and compare the two codewords through all sixteen 68-symbol lane windows. This fixture must not be relabeled as the teaching MAC frame.

## Task 9: Calculate physical lane bits and PAM4 symbol values

**Files:** Create `engine/pma.ts`, `pam4.ts`, `test/inspector-pma-pam4.test.ts`; extend reference tables/script/fixtures.

**Interfaces:** Define `PmaMuxSchedule={pmdLane:number;unit:'bit';periodBits:number;sourcePcsLaneByPhase:readonly number[];initialPhase:number;phaseAdvance:'(initialPhase + absoluteOutputBit) mod periodBits'}` and `PmaMappingProfile` with provenance and fixture hash; scope and PMA/PMD boundary; 16:4 geometry; one `PmaMuxSchedule` per PMD lane; boundary bit indexing; PMD-to-MDI and MDI-to-fiber maps; polarity transform and its stage; dibit order/significance; complete PAM4 labels and normalized-level map; precoder mode/state/reset; and PMA-training/PCS-scrambler boundary. `sourcePcsLaneByPhase.length` must equal `periodBits`; `absoluteOutputBit` is carried across chunks and windows, so rendering a later range never resets mux phase. Only after a profile is supplied may `mapPhysicalLanes(pcs:readonly Uint16Array[], profile:PmaMappingProfile):readonly Uint8Array[]` and `mapPam4(bits:Uint8Array, profile:PmaMappingProfile):{symbols:Uint8Array; normalizedLevels:Int8Array}` be implemented. Never silently reset state per displayed page.

- [ ] Write exact physical-lane and PAM4 fixture comparisons, including all four dibits and boundaries between PCS symbols. Verify the chosen precoding rule or its documented absence for this exact PMD. Expected symbol labels and normalized levels come from that convention, not an arbitrary gray-code example.

```ts
const physical = mapPhysicalLanes(vector.pcs.map(v=>Uint16Array.from(v)), PROFILE);
expect(physical.map(v=>Array.from(v))).toEqual(vector.physicalBits);
const pam = mapPam4(physical[0], PROFILE);
expect(Array.from(pam.symbols)).toEqual(vector.lane0Symbols);
expect(Array.from(pam.normalizedLevels)).toEqual(vector.lane0Levels);
```

- [ ] Do not begin implementation until a `PmaMappingProfile` and independent vectors are supplied. IEEE does not define one universal 16-to-4 implementation sequence in the evidence available to this project. A generic round-robin fold is not an acceptable substitute. When supplied, convert coded bits to the specified dibits and labels in time order, preserve intermediate outputs before any precoder, and advance each PMD schedule from its absolute output-bit position.
- [ ] Verify total bit conservation, independent lane ordering, complete fixture equality and phase continuity. Compare a later window against the same absolute slice of a complete PMD output, including a boundary that crosses `periodBits`; it must not restart at `initialPhase`. Label sample index as symbol index, optionally convert to time using the fixed profile baud. Never label normalized levels in volts or present an ideal level plot as an eye diagram.
- [ ] Run `npx vitest run test/inspector-pma-pam4.test.ts` and upstream tests; commit `feat: calculate physical lane and PAM4 symbol outputs`.

## Task 10: Compose one reproducible run with honest provenance

**Research gate:** This task cannot create a named-profile run until Tasks 6, 7 and 8b pass their final IEEE line checks, the chosen `RateMatchPolicy` is recorded, any physical output has a selected `PmaMappingProfile`, and an independent fixture covers every enabled stage.

**Files:** Create `engine/run.ts`, `engine/trace.ts`, `test/inspector-run.test.ts`; extend shared types and full-run fixtures.

**Interfaces:** `calculateRun(input:FrameInput, profile:Profile, stream:StreamConfig):Result<InspectorRun>`; `traceSelection(run:InspectorRun, selection:DataRef):readonly TraceEdge[]`.

- [ ] Write full-run tests for default, minimum, maximum, and boundary payloads. Test a changed byte against independent expected outputs at every stage. Repeated identical inputs/state must produce byte-identical snapshots.

```ts
const result = calculateRun(fullVector.input, PROFILE, fullVector.stream);
if (!result.ok) throw new Error(JSON.stringify(result.errors));
for (const expected of fullVector.snapshots) {
  const stage = result.value.snapshots.find(s=>s.stage===expected.stage)!;
  expect(stage.buffers.map(b=>({id:b.id,values:Array.from(b.values)})))
    .toEqual(expected.buffers);
}
```

- [ ] Run tests red. Once the research gate is met, compose the pipeline strictly in the checked order: `buildMacFrame`, `prepareStream`, `encode66`, `transcode257`, continuous `scramble`, `insertMarkers`, `splitFecMessages`, `encodeRs544`, `interleaveCodewords`, `distributePcs`, `mapPhysicalLanes`, and `mapPam4`. Carry scrambler, AM, rate-match and PMA state across groups. `id` is a deterministic digest or stable local run key derived from applied input/profile/state and selected contracts, never a random source of calculation behavior. Each snapshot references the same run and explicit units; no stage pulls example values from a separate array.
- [ ] Implement compact range-based trace edges: copied MAC bytes, encoded block inputs, parity dependencies on entire RS messages, marker insertion, and lane permutations. Scrambled data and parity are dependency relationships, not intact copies of payload bytes. Avoid an all-to-all per-bit dependency matrix; summarize recurrence/state dependencies as bounded ranges and state references.
- [ ] Test selection ranges at each buffer boundary, inserted markers with no frame source, parity spanning a message, and frame data crossing multiple codewords. Never highlight a direct identity mapping when only a dependency exists.
- [ ] Enforce length/allocation limits before creating buffers and catch malformed internal input as typed run errors. Test default/max samples complete inside the 262,144-coded-bit cap. Run engine tests and typecheck; commit `feat: compose verified frame inspection runs and traces`.

## Task 11: Keep calculations responsive and reject stale results

**Files:** Create `workerProtocol.ts`, `inspector.worker.ts`, `useInspectorRun.ts`, `test/inspector-worker.test.tsx`; modify App to keep one inspector controller mounted across view changes.

**Interfaces:** `useInspectorRun():{run:InspectorRun|null; status:'idle'|'running'|'ready'|'error'; error:string|null; apply:(input:FrameInput)=>void}`. Worker request is `{kind:'calculate'; requestId:number; input:FrameInput; profileId:ProfileId; stream:StreamConfig}`; responses echo requestId and carry either `Result<InspectorRun>` or an internal-error message.

- [ ] Write a controlled fake-worker test for two Apply actions whose responses arrive in reverse order. Verify only the newest response appears; invalid input never sends a request; failures leave the last successful run visible with an explicit error/stale label.
- [ ] Run tests red. Create the real Vite worker with:

```ts
const worker = new Worker(new URL('./inspector.worker.ts', import.meta.url), {type:'module'});
```

Increment requestId per Apply. Ignore responses not matching the latest request. Terminate/recreate the worker on a superseding request to stop wasted work; cleanup on app unmount. Resolve the immutable profile inside the worker from profileId. Handle `error` and `messageerror`. Do not detach arrays still used by the editor when transferring data.
- [ ] Keep the hook mounted in App so view changes preserve the applied run and pending job. Mark previous output "Previous result" while computing a newer input; do not combine old metadata with new byte arrays. Disable export until a complete current run exists if export is added later.
- [ ] Run worker interaction tests, typecheck, and a production build to verify worker chunk emission. Commit `feat: compute inspector runs off the main thread`.

## Task 12: Render exact values and linked stage selections

**Files:** Create `StageWorkspace.tsx`, `DataWindow.tsx`, `LaneView.tsx`, `Pam4View.tsx`, `test/inspector-workspace.test.tsx`; extend `FrameInspector.tsx`, `StageRail.tsx`, `FieldDetails.tsx`, and `inspector.css`.

**Interfaces:** Add `{run:InspectorRun|null; status:'idle'|'running'|'ready'|'error'; error:string|null}` to FrameInspector and derive MAC from run, removing its temporary `mac` prop. `StageWorkspace` consumes `{run:InspectorRun; stage:InspectorStage; selection:DataRef|null; onSelect:(ref:DataRef)=>void}`. `DataWindow` consumes `{snapshot:Snapshot; bufferId:string; start:number; count:number; selected:DataRef|null; onSelect:(ref:DataRef)=>void}`. FieldDetails consumes the selected DataRef and `traceSelection` output.

- [ ] Write tests selecting a frame field, encoded block, parity range, lane unit, and PAM4 symbol. Assert exact values and units from the provided run, not hard-coded strings from the mockup.

```tsx
render(<StageWorkspace run={verifiedRun} stage="mac" selection={null} onSelect={onSelect}/>);
await userEvent.click(screen.getByRole('button',{name:/FCS/}));
expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({stage:'mac',count:4}));
```

- [ ] Run tests red. Implement the nine-stage rail, before/after data panels, a byte/bit/symbol representation switch appropriate to the stage, and selected value details. Keep field names in plain language with optional protocol detail. Include real offset, length, unit, source references, and display-order labels.
- [ ] Bound each window to 64 displayed units with previous/next page controls and absolute offsets. Preserve the selected absolute offset during pagination and reset invalid selection on a new run. Lane view offers all 16 logical lanes and four physical lanes through labeled selection; show small synchronized previews, not thousands of cells. Never downsample data without labeling the shown range.
- [ ] Render a discrete PAM4 level sequence for the selected physical lane, with index and normalized-level axes, keyboard-selectable symbol controls, and a text equivalent. Use theme-aware diagram tokens and reduced-motion support. Show "Calculated normalized symbols" beside it.
- [ ] Match the mockup's hierarchy, amber actions, compact profile tag, and blue data highlights. Add legends for "direct mapping", "depends on", and "inserted" where relevant. Use semantic text and shapes as well as color. Reflow at 320px and 760px.
- [ ] Test loading, errors, empty selection, last-page bounds, new-run selection reset, both themes, and no bit/byte unit confusion. Run targeted tests and build; commit `feat: add linked data inspection across PHY stages`.

## Task 13: Connect the walkthrough without replacing it

**Files:** Modify App, Header, Stepper; create `test/inspector-integration.test.tsx`; extend stageMap and inspector entry UI.

**Interfaces:** Add optional `onInspect:(stageId:string)=>void` to Stepper. Add Header inspector entry and a presentation mode that hides unrelated global rate/direction/generation controls while in the fixed-profile inspector, replacing them with a clear profile label. Preserve their state for return. Keep search and theme available.

- [ ] Write integration tests for all nine TX and RX entry points, exact context restoration, and unsupported-context messaging. Verify the existing walkthrough remains nine steps with its current art/text and Next/Back behavior.

```ts
expect(stageForWalkthrough('scramble')).toBe('scramble');
expect(stageForWalkthrough('rx-descramble')).toBe('scramble');
expect(stageForWalkthrough('serialise')).toBe('physical-lanes');
```

- [ ] Run tests red. Add "Inspect this stage" near Read more. Supported context opens immediately; unsupported context opens a clear explanation with "Open 400G TX example" and "Return to walkthrough". That explicit action changes inspector context only, never the saved learning context. For an unsupported direct URL, use the same screen.
- [ ] Ensure one Escape owner per view. App must not process walkthrough Escape while Stepper owns it; Stepper must unmount when inspector is active. Inspector Escape first closes its local disclosure, then returns. When a modal search is open, its Escape is consumed first. Arrow keys change stages only on non-editable inspector surfaces; inputs, textarea, select, and contenteditable retain normal keyboard behavior.

```ts
const target = event.target as HTMLElement | null;
if (event.defaultPrevented || target?.closest('input,textarea,select,[contenteditable="true"]')) return;
if (document.querySelector('dialog[open]')) return;
```

Use the isolated checkout's real search visibility mechanism if it lacks a native dialog; do not copy the dirty working tree's search rewrite to satisfy this test.
- [ ] Restore focus to the initiating "Inspect this stage" button after return using an App-owned ref and post-render effect; direct-route exit focuses the destination heading. Keep draft/applied run while navigating to a topic via search; search selects stack view and clears inspector route-only fields. Preserve recents behavior by not recording inspector page changes as topic visits.
- [ ] Run integration, navigation, and existing tests. Commit `feat: link frame walkthrough and inspector with safe return navigation`.

## Task 14: Verify complete behavior in a real browser

**Files:** Create `playwright.config.ts`, `e2e/inspector.spec.ts`, `docs/inspector-review.md`; add dev-only Playwright and scripts to package.json/lockfile. Ignore browser test report/output directories.

**Interfaces:** `npm run test:e2e` executes browser checks against Vite preview on port 4173 with the production base path. Tests must not be picked up by Vitest.

- [ ] Configure the browser test server and add a real worker test:

```ts
// playwright.config.ts
export default defineConfig({
  testDir:'./e2e', use:{baseURL:'http://127.0.0.1:4173/ethernet-onboarding/'},
  webServer:{command:'npm run preview -- --host 127.0.0.1 --port 4173',
    url:'http://127.0.0.1:4173/ethernet-onboarding/', reuseExistingServer:!process.env.CI},
});
```

Import `defineConfig` from `@playwright/test`; add `test:e2e: playwright test`. Build before running preview. Install Chromium with `npx playwright install chromium`.

```ts
test('returns to the same walkthrough step',async ({page})=>{
  await page.goto('./?view=frame&step=5');
  await page.getByRole('button',{name:'Inspect this stage'}).click();
  await expect(page.getByRole('heading',{name:'Interactive frame inspector'})).toBeVisible();
  await page.getByRole('button',{name:'Return to walkthrough'}).click();
  await expect(page).toHaveURL(/view=frame&step=5/);
});
```

- [ ] Cover actual Worker success, failed validation, two rapid valid submissions, Back/Forward, direct URL reload, unsupported source context, both theme modes, search Escape precedence, input arrow keys, and selected-field focus. Assert displayed FCS against the independent fixture.
- [ ] Test viewport widths 320, 768, and 1440; ensure `document.documentElement.scrollWidth <= window.innerWidth`. Verify payload tables stay inside their bounded panel. Capture named screenshots for MAC, FEC, lane, and PAM4 views in light/dark and mobile; inspect screenshots rather than merely generating them.
- [ ] Measure default and 1,500-byte computations after warm-up, recording environment and p50/p95. Target p95 under 500 ms, no page main-thread task above 50 ms attributable to calculation, and no unbounded DOM growth. If unmet, profile data copying and range rendering before changing caps; do not hide incompleteness with silent truncation.
- [ ] Run `npm test`, `npm run typecheck`, `npm run build`, `npm run test:e2e`. Record precise pass/fail counts and source/vector coverage in the review document. Commit `test: verify inspector calculations and browser workflows`.

## Task 15: Document scope and prepare branch review

**Files:** Update README, `docs/inspector-profile.md`, `docs/inspector-review.md`, and this plan's task checkboxes.

**Interfaces:** Produces a reviewable feature branch and reproducible verification record, not a merge or release.

- [ ] Document the separate entry points, Apply behavior, preserved return context, exact supported profile, how to inspect offsets/representations, deterministic seed/context, and unsupported RX/rate/analog capabilities. State that refresh resets custom frame contents. Do not imply IEEE certification or hardware measurement.
- [ ] Add a coverage table linking every A1..A9 requirement to tests/manual evidence. Record independent oracle provenance, published-vector limits, fixture checksums, and any unresolved protocol questions. Unresolved required calculation rules mean the feature is incomplete and must remain a draft review.
- [ ] Verify branch scope with:

```powershell
git status --short
git diff --check
git diff --stat main...HEAD
git log --oneline main..HEAD
```

Use the repository's actual target base if it changed, and record it. Confirm unrelated topic-search/style changes are absent. Re-run only checks invalidated by any final edits.
- [ ] Commit docs with `docs: document verified frame inspector and review evidence`. Provide branch name, final commit, test results, screenshots, and limitations. Suggested review title: `Add a calculated frame inspector alongside the guided walkthrough`.
- [ ] If a PR is requested during execution, publish the feature branch and open a **draft PR** with the profile scope, before/after behavior, calculations verified, and browser checks. Attach its URL to the task with the app artifact tool. Do not merge, deploy, or push main. A branch ready for review fulfills the current branch requirement without requiring a remote PR.

## Risk controls and completion checklist

| Risk | Required control |
|---|---|
| Mistaking a teaching diagram for an encoder | Engine never depends on StageArt or mockup arrays; independent frozen fixtures. |
| Incorrect FCS/bit/symbol order | Explicit representation labels and full nonzero vectors at every boundary. |
| Frame-only input treated as a whole PHY stream | Seed/phase/idle context captured in each run. |
| Fake AM overhead or scheduling | Marker and idle-compensation ledger plus boundary fixtures. |
| Incorrect PMA fold or precoding | Exact selected-profile contract and physical-lane/symbol vectors. |
| Claiming intact payload through scrambling/parity | Direct mapping and dependency traces are distinct. |
| Dropping existing walkthrough state | URL round-trip, Browser Back, direct-link, and focus tests. |
| Simultaneous keyboard handlers | One active-view owner and search-dialog precedence tests. |
| UI stalls or stale outputs | Worker lifecycle, bounded snapshots, stale-ID tests, actual browser measurements. |
| Existing uncommitted work enters review | Isolated checkout, named-file staging, final base diff. |

- [ ] A1 and A2: Tasks 4, 13, 14 pass.
- [ ] A3: Tasks 3 and 5 pass.
- [ ] A4: Tasks 2 and 6 through 10 pass with independent evidence.
- [ ] A5: Tasks 10 and 12 pass.
- [ ] A6: Tasks 2, 5, 13, 14 pass.
- [ ] A7: Tasks 11 through 14 pass.
- [ ] A8: Tasks 2, 14, 15 pass.
- [ ] A9: Tasks 1 and 15 pass.

## Execution handoff

The plan is ready for review. Choose subagent-driven execution with review between tasks, or inline execution using `superpowers:executing-plans`. Create the isolated feature branch only when implementation begins. No application implementation was performed while writing this plan.
