# Interactive Frame Inspector review

Reviewed 2026-09-24 on the isolated `codex/interactive-frame-inspector` worktree.

## Browser evidence

`e2e/inspector.spec.ts` verifies these user flows in Chromium:

- Direct inspector and stage URLs show the unavailable state before an applied run.
- Editing a frame leaves the prior worker-result FCS and calculated FEC window unchanged until **Apply frame** starts a new worker-backed calculation. The resulting FCS changes only after the new worker result is rendered.
- Two rapid, distinct Apply actions render the FCS from an independently calculated final draft. A controlled worker-hook test delivers replies out of order and proves that the stale distinct request cannot replace the newer result.
- Header entry, direct inspector and stage URLs, walkthrough entry and exact return, and browser Back and Forward are covered.
- PAM4 output carries the experimental reference, candidate source, local fixture, and non-conformance labels.
- Keyboard focus moves through the stage rail in its visible order; the active stage is exposed with `aria-current="step"`. The form status message is labelled with a polite live region, and invalid input has an associated alert.
- At 390 CSS pixels wide, and at a 640 CSS pixel 200 percent zoom-equivalent viewport, the inspector has no document-level horizontal overflow. The reduced-motion media query is exercised at that viewport.

The browser command is `npm run test:e2e`. It uses a Vite server on port 5175
and does not make network requests during a test run.

## Accessibility review

Keyboard controls are native buttons and form controls. The stage rail has the
`Frame processing stages` navigation label and uses `aria-pressed` for the
selected stage. The selected stage has a visible focus indicator from the shared
focus style. The inspector does not use a dialog or focus trap. Frame inputs
have labels, descriptions, validation error association, and invalid-state
semantics. Calculation and selection status use polite live regions; calculation
errors use an alert.

The stage rail changes to two columns and the editor changes to one column. The
shared reduced-motion rule shortens transitions and animations when the operating
system requests reduced motion. Contrast has not been measured with a dedicated
contrast tool, and screen-reader announcements have not been tested with a target
assistive-technology combination. Those remain manual review items.

## Provenance and capability audit

The browser suite checks visible experimental-reference labels only. The frozen
end-to-end fixture hashes are recomputed by `test/inspector-run.test.ts`; it
checks encode, transcode, scramble, marker, FEC message and codeword, lane, and
PAM4 artifacts. `test/inspector-profile.test.ts` rejects unsupported tuples,
and `test/inspector-run.test.ts` rejects a non-reference profile before a run is
built. Physical-lane and PAM4 views name the reference PMA mapping and
state that PAM4 values are normalized labels, not measured voltage or optical
power. The IEEE-only 400G TX profile remains verification-blocked. Unsupported
stages show an unavailable state before a reference calculation is applied.

The final IEEE profile cannot be enabled yet. The remaining documents and their
required evidence are listed in [inspector-missing-sources.md](inspector-missing-sources.md):

- IEEE Std 802.3-2022 Clause 49, especially 49.2.6.
- IEEE Std 802.3-2022 Clause 82 control tables and rules.
- IEEE Std 802.3-2022 Annex 119A 400G transmit examples.

Those extracts must retain original bytes, edition, printed page numbers, and
SHA-256 hashes before the line-check register and frozen fixture can be updated.
