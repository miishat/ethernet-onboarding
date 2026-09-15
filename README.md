# Ethernet Onboarding

An interactive instrument for learning the high-speed Ethernet PHY stack - **400G, 800G
and 1.6T**, one sublayer at a time. Start anywhere, drill down to any depth, watch the
arithmetic change as you switch rate and direction, and follow a single frame all the
way from MAC octets to PAM4 symbols on the wire.

Rebuilt from a single 3,000-line component into a modular **Vite + React + TypeScript**
project, with a refined instrument aesthetic and a **light / dark** theme.

## Highlights

- **The stack as a map.** The left column is always a navigable diagram of the PHY data
  path in zone bands; the right column is the content. Click to drill in at every level
  until a page has nothing left inside - at which point the canvas *becomes* the diagram.
- **Rate- and direction-aware.** Every clause number, lane count and parameter is keyed
  by rate (400G / 800G / 1.6T) and by transmit / receive.
- **Follow a frame.** A nine-stage stepper animates the payload transforming at each
  sublayer, with the arithmetic for the current rate. Arrow keys work; `Esc` closes it.
- **Custom SVG diagrams.** Round-robin distribution, bit-fields, Reed–Solomon codewords
  with a live 15-symbol error budget, lane skew, PAM4 eyes, BER waterfalls and more -
  all theme-aware.
- **Verified content.** Facts are sourced against [`research-brief.md`](research-brief.md),
  with `draft`, `inferred` and `industry` badges where confidence is qualified.
- **Light & dark themes** with a toggle; the choice persists and defaults to the OS
  preference. Keyboard navigation and `prefers-reduced-motion` are respected throughout.

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
```

```bash
npm run build    # type-check + production build into dist/
npm run preview  # serve the production build
npm run typecheck
```

## Project structure

```
src/
  main.tsx              app entry (fonts, theme provider)
  App.tsx              state + layout orchestration
  types.ts             shared domain types
  theme/
    palette.ts         dark + light palettes and zone colours
    ThemeContext.tsx   provider, useC(), useZones(), useTheme()
  styles/global.css    CSS-variable design tokens, shell styling, motion
  data/
    stack.ts           DATA - the sublayer content tree (verbatim, verified)
    stepper.ts         LANES + the nine frame stages
    visuals.ts         diagram specifications, keyed by node id
    tree.ts            navigation + rate-keyed accessors
  components/          Header, StackCanvas, DrillCanvas, ContentPanel, Diagram,
                       Stepper, StageArt, Prose, Params, Quiz, and shell pieces
legacy/                the original single-file EthernetStack.jsx, for reference
```

### How theming works

The original component hard-coded colours straight into SVG attributes. Here, both
palettes expose identical keys, and every renderer reads the current palette through
`useC()`, so switching theme simply re-renders each SVG with new colours. The shell
mirrors the same tokens as CSS custom properties (`theme/palette.ts` ↔ `styles/global.css`)
so hovers, focus rings, transitions and media queries are handled in real CSS.

## Adding or editing content

All content lives in `src/data/`. A block is a node in `DATA` with optional `subs` /
`sections`; any field can be given per rate or as `all`. Give a page a diagram by adding
an entry to `VISUALS` keyed by the node's `id`. Nothing else needs to change.
