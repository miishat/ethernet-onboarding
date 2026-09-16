# UI/UX Audit: Ethernet Onboarding

Audit date: 2026-09-15

## Product context and scope

This review assumes the product will be used primarily on desktop and laptop displays by technically sophisticated learners. Mobile use is expected to be rare. Mobile issues are still documented, but they are treated as resilience improvements rather than launch-critical work.

The audit covers the root stack, a PCS drill-down, the frame walkthrough, light and dark themes, keyboard behavior, navigation semantics, learning progress, technical diagrams, and the responsive implementation. The live interface was reviewed at 1280 x 800, with a narrow-screen spot check at 390 x 844. The production build and all 15 existing UI refinement tests pass.

## Executive summary

Ethernet Onboarding already has a strong desktop foundation. Its map-and-content layout matches the subject matter, the diagram language is coherent, and the restrained instrument aesthetic gives dense technical material a credible identity. The application is especially effective when a learner explores a stack layer and sees the explanatory article beside its structural map.

The most valuable improvements are not a mobile redesign. They are desktop workflow improvements: make every topic linkable and compatible with browser history, manage keyboard focus when panels change, make progress durable and meaningful, improve search and topic discovery, and fix accessibility gaps in contrast and modal behavior.

Mobile shortcomings remain real, particularly the large wrapped header and the scaled SVG map, but they should be addressed after the primary learning workflow is more navigable, recoverable, and accessible.

## Six-pillar scorecard

| Pillar | Score | Assessment |
| --- | ---: | --- |
| Visual hierarchy and polish | 3/4 | Strong desktop composition, typography, diagrams, and visual identity. The header is dense and some secondary labels are too subdued. |
| Navigation and interaction | 2/4 | Drill-down and frame walkthrough are conceptually strong, but URLs, browser history, search, focus movement, and resume behavior are missing. |
| Responsive behavior | 3/4 | The primary desktop layout works well. Narrow layouts are weak, but mobile is not a core usage context. |
| Accessibility | 2/4 | Keyboard activation and visible focus exist, but contrast, dialog semantics, announcements, target sizes, and state semantics need work. |
| Content and learning experience | 3/4 | Content is credible and pedagogically thoughtful. Long passages, incomplete-topic signaling, and limited recovery tools slow repeat use. |
| Consistency and system quality | 3/4 | The token system and component language are coherent. Some inline styling and ambiguous state conventions remain. |
| **Overall** | **16/24** | **A strong specialist desktop experience that needs better navigation, accessibility, and learning continuity.** |

## 20 prioritized recommendations

### 1. P0: Put navigation state in the URL and browser history

**Why it matters:** This is the largest gap in the primary desktop workflow. The selected path, rate, direction, lane rate, and walkthrough stage exist only in React state. Browser Back does not climb the learning path, pages cannot be bookmarked or shared, and reload returns to the root.

**Recommendation:** Encode topic state in route segments and configuration in query parameters, for example `/pcs/alignment-markers?rate=800G&dir=tx`. Push history on drill-down and walkthrough transitions, restore state on load, and update the document title for every topic.

### 2. P0: Manage focus after every view change

**Why it matters:** Clicking an SVG block replaces the content panel while focus remains on the old control. Opening or closing the walkthrough also does not move focus to its heading or return it to the trigger. This makes keyboard navigation disorienting even on desktop.

**Recommendation:** Focus the new content `<h2>` after navigation, focus the walkthrough heading on open, and restore focus to the invoking control on close. Add `tabIndex={-1}` to programmatically focused headings and preserve a logical keyboard sequence.

### 3. P0: Raise contrast for small labels and active controls in both themes

**Why it matters:** Measured token pairs include dark `faint` on `ink2` at 3.59:1, light `signal` on `ink` at 3.38:1, light `signal-ink` on `signal` at 3.85:1, and light `good` on white at 3.99:1. These colors are used for text as small as 9 to 13 px, including meaningful diagram and status labels.

**Recommendation:** Create separate decorative and text tokens. Require at least 4.5:1 for normal text and 3:1 for non-text UI boundaries. Darken the light amber, lighten the dark faint text, and retune green success text. Add automated contrast assertions for both palettes.

### 4. P0: Make the enlarged diagram a complete accessible modal

**Why it matters:** The dialog has no visible close button, no `aria-modal`, no labelled-by relationship, no focus trap, no background inert state, and no focus restoration. The current "click outside to close" instruction does not provide a complete keyboard interaction.

**Recommendation:** Add a visible "Close diagram" button, `aria-modal="true"`, `aria-labelledby`, initial focus, focus containment, Escape handling, inert background content, and focus restoration to the Enlarge button.

### 5. P1: Persist progress and define what "read" means

**Why it matters:** Visited state is memory-only, resets on reload, and increments when some nodes are clicked rather than when content is meaningfully viewed. The 0 / 90 meter does not explain its denominator or completion rule.

**Recommendation:** Persist progress locally by content version, define completion consistently, and add a progress details view with completed topics, remaining topics, and reset controls. Label the compact meter as "0 of 90 topics" visually, not only to assistive technology.

### 6. P1: Add search and a complete topic index

**Why it matters:** The application contains about 90 trackable topics, but discovery depends on drilling through the map. A returning engineer cannot jump directly to a known term, standard clause, or sublayer.

**Recommendation:** Add keyboard-accessible search across names, aliases, summaries, glossary terms, and clauses. Include a browseable index grouped by stack layer, plus "recently viewed" and "resume learning" shortcuts.

### 7. P1: Reduce desktop header density and clarify control hierarchy

**Why it matters:** Six control groups compete with the title in one strip. Rate, direction, lane rate, walkthrough, progress, and theme receive similar weight even though rate and direction most strongly affect the content.

**Recommendation:** Keep rate, direction, and Follow a Frame primary. Move physical lane rate, detailed progress, theme, and content status into a quieter utility cluster. Preserve current values as compact text when secondary controls are collapsed.

### 8. P1: Clarify control dependencies and hide irrelevant controls

**Why it matters:** "Per lane" is presented as a peer to MAC data rate and direction, but its effect is not obvious and is mostly relevant to physical lane mapping. Users can change it while reading content where nothing visibly changes.

**Recommendation:** Rename it to "Physical lane rate", add concise explanatory text, and show it only when the current view or walkthrough stage uses it. If it remains global, briefly highlight the values that changed after selection.

### 9. P1: Announce global state changes and resulting content updates

**Why it matters:** Changing rate, direction, or lane rate updates many labels and parameters without a screen-reader announcement. Opening glossary definitions and quiz feedback also inserts content silently.

**Recommendation:** Add a restrained `aria-live="polite"` status region for messages such as "Showing 800G transmit parameters". Use `aria-expanded` and `aria-controls` for definitions, and announce quiz results without moving focus unexpectedly.

### 10. P1: Add stronger wayfinding and recovery controls

**Why it matters:** Breadcrumbs help within a branch, but there is no visible previous topic, next topic, recent location, or resume action. Escape climbs a level, but that shortcut is not discoverable in the main experience.

**Recommendation:** Add previous and next topic controls based on the current direction, a visible "Back to stack" action, recently viewed topics, and a compact keyboard-shortcuts panel. Keep the breadcrumb and current location prominent.

### 11. P1: Restructure long articles for faster technical scanning

**Why it matters:** PCS and similar pages open with several long paragraphs before the diagram and parameter table. The prose is good, but engineers often arrive looking for a mechanism, rate-specific value, or clause reference.

**Recommendation:** Start each topic with a two-sentence summary and 3 to 5 key takeaways. Add descriptive headings for mechanism, rate differences, implementation notes, and common misconceptions. Keep each diagram close to the paragraph that explains it.

### 12. P1: Put the walkthrough interaction before its full instructions

**Why it matters:** The walkthrough begins with three explanatory paragraphs before the active stage card. Even on desktop, this delays the feature the user explicitly chose and weakens its identity as the hero interaction.

**Recommendation:** Show a one-sentence orientation and the active stage first. Move extended instructions into a collapsed "How this works" section or a side note. Keep the current stage, Back, and Next visually dominant.

### 13. P1: Make selected, current, and completed states redundant with color

**Why it matters:** Amber, green, and subtle stroke differences communicate active, completed, and read states across diagrams. Text labels appear in some places but the convention is inconsistent.

**Recommendation:** Pair color with stable icons and labels such as "Current", "Read", "Draft", and "Outline". Add a small legend near the map and use the same state treatment in the map, child list, progress view, and walkthrough.

### 14. P1: Surface incomplete content before users enter it

**Why it matters:** Some nodes are outlines, but the root map does not consistently expose that status before selection. Users may drill several levels before learning that a page is unfinished.

**Recommendation:** Mark outline nodes directly in every navigation surface, show overall content coverage, and add a "Published topics only" filter. Replace the pulsing global WIP badge with a quieter and more precise coverage summary.

### 15. P2: Improve quiz semantics and recovery

**Why it matters:** Each question is a paragraph followed by buttons, and all answers become disabled after one choice. There is no fieldset and legend relationship, live feedback, retry, or explanation review state.

**Recommendation:** Use `<fieldset>` and `<legend>`, announce feedback, keep focus near the result, and add "Try again" and "Show explanation" actions. Preserve completed quiz state as part of progress rather than treating a topic click as learning completion.

### 16. P2: Improve glossary disclosure behavior

**Why it matters:** Definition buttons have an accessible label but no `aria-expanded` or `aria-controls`. The inserted definition can cause layout movement and is not linked semantically to its trigger.

**Recommendation:** Implement a disclosure pattern with stable IDs, expanded state, and a labelled definition region. On wide screens, consider a non-modal side note or anchored popover that keeps the surrounding paragraph stable.

### 17. P2: Enforce larger hit areas for compact desktop controls

**Why it matters:** Walkthrough tick buttons are only 7 px tall, breadcrumb buttons have almost no target padding, and glossary terms are small inline targets. These are error-prone for trackpads, touch-enabled laptops, and users with limited dexterity.

**Recommendation:** Keep compact visuals but add larger transparent hit boxes. Target at least 24 by 24 px under WCAG 2.2, with 44 px where space permits. Add spacing between adjacent controls and verify at 200 percent zoom.

### 18. P2: Offer a focused reading mode for dense topics

**Why it matters:** The persistent map is valuable for orientation, but it also holds half the canvas while reading long articles and inspecting technical diagrams. Some users will want maximum width after they understand their position.

**Recommendation:** Add a "Focus reading" toggle that collapses the map into a narrow location rail. Preserve breadcrumb context and provide one-click restoration. Let enlarged diagrams use the available desktop viewport more fully.

### 19. P3: Compact the header on narrow screens

**Why it matters:** At 390 x 844, the wrapped sticky header measures about 325 px tall and consumes roughly 39 percent of the viewport. This is a genuine responsive defect, but it affects a low-frequency usage context.

**Recommendation:** Under 640 px, make the header non-sticky or reduce it to a title row, current context summary, and Settings disclosure. Keep Follow a Frame as one visible action.

### 20. P3: Replace the scaled SVG with a narrow-screen topic navigator

**Why it matters:** At 390 px wide, primary stack nodes shrink to about 119 x 29 px. The full structure remains visible, but labels and targets become too small for comfortable use.

**Recommendation:** At the mobile breakpoint, render the core path as a vertical list or accordion with larger rows. Put adjacent and interface topics in separate collapsible groups, while retaining the full SVG as an optional overview.

## Recommended implementation order

1. URL routing, browser history, document titles, and focus management.
2. Contrast tokens, modal semantics, announcements, and state labels.
3. Persisted progress, search, topic index, and wayfinding.
4. Header hierarchy, control dependencies, walkthrough structure, and article scanning.
5. Quiz, glossary, hit areas, focus reading, and incomplete-content signaling.
6. Narrow-screen header and mobile navigation when usage data justifies the work.

## Verification performed

- `npm run build`: passed.
- `node --test test/ui-refinements.test.mjs`: 15 of 15 passed.
- Live inspection at 1280 x 800, with a 390 x 844 resilience check.
- Desktop root, PCS drill-down, frame walkthrough, theme tokens, and keyboard semantics reviewed.
- Palette contrast spot checks performed against actual theme tokens.

