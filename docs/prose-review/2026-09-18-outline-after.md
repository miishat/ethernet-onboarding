# Missing lessons: after

Review branch: `codex/finish-outline-lessons`. No push or merge is included in this work.

All ten previously unwritten nodes now have a lesson, a reference table and one self-check. All 103 topic IDs and their ordering are retained. The earlier editorial reports remain unchanged.

| Lesson | Teaching progression and important qualification |
| --- | --- |
| FEC degrade signalling | Error load, window/threshold behavior, monitoring versus peer signalling, then diagnosis. Implementation behavior is explicitly scoped. |
| Clock and data recovery | Sampling timing, feedback trade-off, PAM4 decisions, unit-interval examples, then the limits of lock status. |
| Copper and backplane: CR and KR | Identify the medium, interpret lane counts, qualify the electrical channel, then distinguish startup from qualification. |
| Multimode: SR and VR | Read the full PMD name before comparing generation, lane count and fibre-dependent reach. Separate project objectives from compliance limits. |
| Single-mode fibre | Separate attenuation accounting from dispersion and the other optical constraints. The loss calculation is hypothetical. |
| Multimode fibre | Explain pulse spreading before introducing launch conditions and bandwidth units. Check the whole installed channel. |
| Twinax copper | Explain the assembly before loss, reflections, coupling and qualification. Distinguish passive and active products. |
| Co-packaged optics | Begin with placement, introduce one named implementation, then discuss boundaries and serviceability without universal promises. |
| Clause 73 autonegotiation | Scope, information exchange, advertised abilities, resolution, technology-specific FEC and startup diagnosis. |
| Link training | Selected mode, adjustment exchange, readiness, multi-segment coordination and operating-data checks. Complements rather than repeats the AUI overview. |

The Medium and Autonegotiation overviews now point readers into the completed lessons. The opening coverage statement no longer lists outlines. Related AUI and Autonegotiation references also correct the obsolete draft training-annex number from 176A to 178B, following the accepted IEEE renumbering. No lane diagrams, navigation mechanics or existing walkthrough stages were changed.

## Research boundaries

Primary sources and claim scopes are recorded in [the research register](2026-09-18-outline-research.md). Public task-force presentations are not represented as complete published standards. Draft channel limits, universal training timers, exact register addresses and automatic power-saving percentages were deliberately omitted.

These are onboarding lessons, not a substitute for the full normative state machines or compliance procedures. Content checks validate structure, not physical-layer correctness; technical review rests on the source register and the qualifications in the prose.

## Verification

- `node scripts/prose-review.cjs verify`: 103 topics, 103 prose passages, zero outlines, 103 parameter tables, 52 questions and 18 unchanged walkthrough stages. IDs/order, quiz indices, inline definitions and the no-em-dash rule pass.
- `npm run build`: TypeScript and production build pass.
- `npm test`: 23 Node checks and 36 Vitest tests pass, 59 total.
- `git diff --check`: passes.

The local development server is listening on port 5173 for review. Unrelated `.planning/`, `vite.log` and `vite-error.log` files were left untouched.
