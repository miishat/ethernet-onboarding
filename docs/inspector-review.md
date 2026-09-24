# Interactive Frame Inspector review

Reviewed 2026-09-24 on the isolated `codex/interactive-frame-inspector` worktree.

## Browser evidence

`e2e/inspector.spec.ts` verifies these user flows in Chromium:

- Direct inspector and stage URLs show the unavailable state before an applied run.
- Editing a frame leaves applied values unchanged until **Apply frame** starts the worker-backed calculation.
- Two rapid Apply actions retain the newest worker request and leave no alert.
- Walkthrough entry returns to the exact prior step. Inspector stage navigation supports browser Back and Forward.
- PAM4 output carries the experimental reference, candidate source, local fixture, and non-conformance labels.
- Keyboard focus moves through the stage rail in its visible order. The form status message is labelled with a polite live region.
- At 390 CSS pixels wide, the inspector has no document-level horizontal overflow.

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

The mobile check at 390 CSS pixels also covers a practical 200 percent zoom
layout equivalent for a 780 pixel desktop viewport. The stage rail changes to
two columns and the editor changes to one column. The shared reduced-motion rule
shortens transitions and animations when the operating system requests reduced
motion. The theme palette uses the existing contrast tokens. Automated contrast
measurement with a screen-reader and visual contrast audit remain manual review
items because they require the user's target browser, operating system, and
display settings.

## Provenance and capability audit

Calculated stages display the selected experimental-reference labels and their
source IDs. Physical-lane and PAM4 views name the reference PMA mapping and
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
