# Build prompt - Ethernet Onboarding, v2

## The task
Turn the single 3087-line `EthernetStack.jsx` into a proper, modern project. Same
content and pedagogy, dramatically better structure, look, and feel. This file is
the instruction set I wrote for myself before building; follow it.

## Non-negotiables (do not break these)
1. **Preserve every fact.** `DATA`, `VISUALS`, `STAGES`, `LANES`, `RATE_META`,
   `ZONES` are verified against `research-brief.md`. Copy them **verbatim** - zero
   edits to strings, numbers, clause references, draft/inferred flags, or `[[term]]`
   links. These blocks contain **no** palette references, so they extract cleanly.
2. **Preserve the pedagogy and interaction model.** Start-anywhere drill-down at
   every depth; the left column is always a *map* (never a content surface); the
   right column is the content panel; the frame-stepper is the hero; TX/RX and
   rate switching drive the whole page; quizzes and glossary terms stay.
3. **Preserve the design soul.** Ink-blue instrument ground, one amber signal accent
   that means "active path / moving data" and appears nowhere else. Desaturated
   per-zone hues. Refine and elevate - do not reinvent.

## Stack
Vite + React 18 + TypeScript. Bundled fonts (no external CDN requests):
Inter (sans) + JetBrains Mono (mono) via `@fontsource`. No UI framework - the
design is bespoke. CSS via one global stylesheet driven by CSS custom properties
(enables theming + transitions + media queries + hover/focus that inline styles
cannot express). No framer-motion; motion is CSS-only for robustness.

## Theming strategy (the crux)
The old file hardcodes 383 `C.*` color strings straight into SVG `fill`/`stroke`.
To get light/dark without rewriting SVG math:
- `theme/palette.ts` exports `PALETTES.dark` and `PALETTES.light`, each an object
  with **identical keys** to the old `C` (ink, ink2, ink3, rule, ruleSoft, text,
  dim, faint, signal, signalDim, signalWash, good, bad, mono, sans, maxW), plus
  light/dark `ZONES`.
- `theme/ThemeContext.tsx` provides `useC()` → current palette object, `useZones()`,
  and `useTheme()` → `{theme, toggle}`. Persist choice to localStorage; default to
  system `prefers-color-scheme`; wrapped in try/catch.
- Every rendering component starts `const C = useC()` instead of reading a module
  const. The SVG math is otherwise untouched. This is the whole trick.
- The shell (header, panels, layout, buttons, lists) is styled with CSS classes
  and `var(--...)` tokens mirrored from the palette onto `:root[data-theme]`, so
  hover/focus/transitions are real CSS.

Light palette design: warm paper-white grounds (not pure white), ink-navy text,
the **same amber** signal (it reads on both), desaturated zone hues re-tuned for a
light ground. Verify contrast on both themes.

## Module layout
```
src/
  main.tsx, App.tsx, vite-env.d.ts, types.ts
  theme/palette.ts, theme/ThemeContext.tsx
  styles/global.css
  data/stack.ts     (DATA, RATES, RATE_META, outline, CORE/IFACE/ASIDE)
  data/stepper.ts   (LANES, STAGES)
  data/visuals.ts   (VISUALS)
  data/tree.ts      (pick, laneLabel, rawKids, kidsOf, nodeAt, descendantIds, TRACKABLE)
  components/ Header, Segmented, Breadcrumbs, ThemeToggle, ProgressMeter,
              StackCanvas, DrillCanvas, ContentPanel, Prose, Params, Quiz,
              Heading, Note, Figure, Diagram, StageArt, Stepper
```

## UX upgrades to add (the "feels better" list)
- Sticky, refined header; theme toggle (sun/moon); progress as a ring/bar not text.
- Responsive: two columns → stacked on narrow; SVG canvases scale to column.
- Motion: panel content cross-fades / slides on navigation (CSS keyframe retriggered
  by React `key`); stepper art transitions between stages; respect
  `prefers-reduced-motion`.
- Interactive SVG blocks get real hover-lift + focus-visible rings (CSS on `<g>`).
- Keyboard: Escape climbs one level; stepper supports ← →.
- Polished empty/outline treatments; nicer "Start anywhere" intro.
- Real focus-visible styling on every control; generous, consistent spacing scale.

## Fidelity checklist before done
- [ ] All three rates render; faces/clauses/params update on switch.
- [ ] TX and RX both work incl. direction-filtered nodes and the changeDir prune.
- [ ] Drill from stack → block → sub → leaf; leaf shows Diagram as canvas.
- [ ] Stepper: all 8 stages, art per shape, per-rate counts, progress bar.
- [ ] Every VISUALS type renders (compare, bitfield, symbols, lanes, fold, skew,
      states, curve, wave, spans) - spot-check pages that use each.
- [ ] Glossary `[[term]]` popovers; quizzes; visited/read tracking + count.
- [ ] Light and dark both correct; toggle persists; SVG recolors.
- [ ] `npm run build` clean (tsc + vite); dev server verified in browser.

## Keep
`research-brief.md` at root. Move the original `EthernetStack.jsx` to `legacy/`
for reference. Write a real `README.md`.
