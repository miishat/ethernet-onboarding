# URL Navigation and Topic Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make learning locations shareable and reload-safe, with browser history, searchable topics, a complete topic index, and recent-topic shortcuts.

**Architecture:** Add a typed navigation module and React hook that synchronize application state with root-level query parameters through the native History API. Build a local topic catalog from the existing content tree, then expose search and a grouped index in an accessible disclosure panel. Execute URL navigation first, then topic discovery as an independently testable work package using the same navigation interface.

**Tech Stack:** React 18, TypeScript, Vite 5, native `URLSearchParams`, native History API, Vitest.

**Spec:** `UI-REVIEW.md`, recommendations 1 and 6. Recommendation 11 is excluded.

## Global Constraints

- Preserve the current Vite base path `/ethernet-onboarding/` for production.
- Do not add React Router or another routing dependency.
- Keep direct-load URLs on the GitHub Pages root and encode state in query parameters.
- Preserve all existing rate, direction, lane-rate, drill-down, walkthrough, Escape-key, and read-tracking behavior.
- Treat malformed or stale URLs as recoverable input. Normalize them to the longest valid state without throwing.
- Use `pushState` for topic and view transitions.
- Use `replaceState` for rate, direction, physical lane rate, and walkthrough-stage changes.
- Browser `popstate` must restore the UI without creating another history entry.
- Default root state remains `400G`, `tx`, `100G per lane`, stack view, no selected topic, and walkthrough step 0.
- Search runs entirely locally without a backend, telemetry, external search service, or additional search library.
- Search names, aliases, summaries, article text, glossary terms and definitions, and clauses across all rates.
- Show only topics whose full ancestry permits the active direction. Keep outlines discoverable and label them explicitly.
- Search selection preserves rate, direction, and physical lane rate, leaves the walkthrough, and pushes a topic history entry.
- Retain the existing verified content without rewriting facts.
- Recent topics are local convenience history, not learning-completion tracking. Store at most 8 paths, handle unavailable storage, and ignore stale paths.
- Desktop is the primary design target. Do not implement the recommendation 11 article redesign.

## Work packages and file responsibilities

Tasks 1-6 implement recommendation 1. Tasks 7-9 implement recommendation 6 after the URL navigation interface exists. Each package is independently reviewable; keep them in this single plan as requested.

| File | Responsibility |
| --- | --- |
| `src/navigation/urlState.ts` | URL codec and navigation validation. |
| `src/navigation/useUrlNavigation.ts` | Browser history synchronization. |
| `src/navigation/documentTitle.ts` | Current location title. |
| `src/search/topicCatalog.ts` | Flatten content, filter by ancestry/direction, and rank local search results. |
| `src/search/recentTopics.ts` | Validate and maintain bounded recent paths. |
| `src/components/TopicExplorer.tsx` | Search input, grouped index, results, recent topics, and resume link. |
| `src/App.tsx` | Connect topic discovery to navigation and record recent article locations. |
| `src/components/Header.tsx` | Display the explorer disclosure without replacing existing controls. |
| `src/styles/global.css` | Theme-aware explorer layout and focus styling. |

## URL contract

| Parameter | Example | Meaning |
| --- | --- | --- |
| `topic` | `pcs/pcs-am` | Slash-separated node IDs from top level to current node. |
| `rate` | `800G` | Omitted for the default `400G`. |
| `dir` | `rx` | Omitted for the default `tx`. |
| `lane` | `200` | Omitted for the default `100`. |
| `view` | `frame` | Omitted for normal stack/article view. |
| `step` | `4` | Walkthrough stage, omitted outside the walkthrough and when zero. |

Examples:

- Root: `/ethernet-onboarding/`
- PCS at defaults: `/ethernet-onboarding/?topic=pcs`
- Alignment markers at 800G TX: `/ethernet-onboarding/?topic=pcs%2Fpcs-am&rate=800G`
- Frame walkthrough stage 4 at 1.6T: `/ethernet-onboarding/?rate=1.6T&view=frame&step=4`

---

### Task 1: Add the navigation state codec and test runner

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `vitest.config.ts`
- Create: `src/navigation/urlState.ts`
- Create: `test/url-state.test.ts`

**Interfaces:**
- Consumes: `Rate`, `Dir`, and `LaneGen` from `src/types.ts`.
- Produces: `UrlNavigationState`, `DEFAULT_URL_STATE`, `decodeUrlState(search)`, and `encodeUrlState(state)`.

- [ ] **Step 1: Add Vitest as the focused TypeScript unit-test runner**

Run:

```bash
npm install --save-dev vitest
```

Update `package.json` scripts to retain the current source assertions and add typed unit tests:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "test": "node --test test/ui-refinements.test.mjs && vitest run"
  }
}
```

Create `vitest.config.ts` so Vitest does not also execute the existing `node:test` file:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
  },
});
```

- [ ] **Step 2: Write failing codec tests**

Create `test/url-state.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  DEFAULT_URL_STATE,
  decodeUrlState,
  encodeUrlState,
} from "../src/navigation/urlState";

describe("URL navigation state codec", () => {
  it("uses the clean root URL for defaults", () => {
    expect(encodeUrlState(DEFAULT_URL_STATE)).toBe("");
    expect(decodeUrlState("")).toEqual(DEFAULT_URL_STATE);
  });

  it("round-trips a deep topic and non-default configuration", () => {
    const state = {
      rate: "800G" as const,
      dir: "tx" as const,
      gen: "200" as const,
      path: ["pcs", "pcs-am"],
      stepping: false,
      stepIndex: 0,
    };

    const search = encodeUrlState(state);
    expect(search).toBe("?topic=pcs%2Fpcs-am&rate=800G&lane=200");
    expect(decodeUrlState(search)).toEqual(state);
  });

  it("encodes the walkthrough without an article topic", () => {
    expect(
      encodeUrlState({
        ...DEFAULT_URL_STATE,
        rate: "1.6T",
        stepping: true,
        stepIndex: 4,
      }),
    ).toBe("?rate=1.6T&view=frame&step=4");
  });

  it("falls back safely for invalid enum and numeric values", () => {
    expect(decodeUrlState("?rate=fast&dir=sideways&lane=50&view=nope&step=-8")).toEqual(
      DEFAULT_URL_STATE,
    );
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run:

```bash
npx vitest run test/url-state.test.ts
```

Expected: FAIL because `src/navigation/urlState.ts` does not exist.

- [ ] **Step 4: Implement the minimal typed codec**

Create `src/navigation/urlState.ts`:

```ts
import type { Dir, LaneGen, Rate } from "../types";

export type NavigationDir = Exclude<Dir, "both">;

export interface UrlNavigationState {
  rate: Rate;
  dir: NavigationDir;
  gen: LaneGen;
  path: string[];
  stepping: boolean;
  stepIndex: number;
}

export const DEFAULT_URL_STATE: UrlNavigationState = {
  rate: "400G",
  dir: "tx",
  gen: "100",
  path: [],
  stepping: false,
  stepIndex: 0,
};

const rates: Rate[] = ["400G", "800G", "1.6T"];
const dirs: NavigationDir[] = ["tx", "rx"];
const generations: LaneGen[] = ["100", "200"];

export function decodeUrlState(search: string): UrlNavigationState {
  const params = new URLSearchParams(search);
  const rateValue = params.get("rate") as Rate | null;
  const dirValue = params.get("dir") as NavigationDir | null;
  const genValue = params.get("lane") as LaneGen | null;
  const rawStep = Number.parseInt(params.get("step") || "0", 10);

  return {
    rate: rateValue && rates.includes(rateValue) ? rateValue : "400G",
    dir: dirValue && dirs.includes(dirValue) ? dirValue : "tx",
    gen: genValue && generations.includes(genValue) ? genValue : "100",
    path: (params.get("topic") || "").split("/").filter(Boolean),
    stepping: params.get("view") === "frame",
    stepIndex: Number.isFinite(rawStep) && rawStep >= 0 ? rawStep : 0,
  };
}

export function encodeUrlState(state: UrlNavigationState): string {
  const params = new URLSearchParams();
  if (state.path.length) params.set("topic", state.path.join("/"));
  if (state.rate !== "400G") params.set("rate", state.rate);
  if (state.dir !== "tx") params.set("dir", state.dir);
  if (state.gen !== "100") params.set("lane", state.gen);
  if (state.stepping) {
    params.set("view", "frame");
    if (state.stepIndex > 0) params.set("step", String(state.stepIndex));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}
```

- [ ] **Step 5: Run the focused test and full test suite**

Run:

```bash
npx vitest run test/url-state.test.ts
npm test
```

Expected: all codec tests and all 15 existing UI refinement tests PASS.

- [ ] **Step 6: Commit the codec**

```bash
git add package.json package-lock.json vitest.config.ts src/navigation/urlState.ts test/url-state.test.ts
git commit -m "test: define URL navigation state contract"
```

---

### Task 2: Validate topics, direction, and walkthrough bounds

**Files:**
- Modify: `src/navigation/urlState.ts`
- Modify: `test/url-state.test.ts`

**Interfaces:**
- Consumes: `DATA`, `rawKids`, and `stagesFor` from existing data helpers.
- Produces: `normalizeUrlState(state)` and `statesEqual(a, b)`.

- [ ] **Step 1: Add failing normalization tests**

Append to `test/url-state.test.ts`:

```ts
import { normalizeUrlState, statesEqual } from "../src/navigation/urlState";

describe("URL navigation state normalization", () => {
  it("keeps the longest valid topic path", () => {
    const normalized = normalizeUrlState({
      ...DEFAULT_URL_STATE,
      path: ["pcs", "pcs-am", "not-a-node"],
    });
    expect(normalized.path).toEqual(["pcs", "pcs-am"]);
  });

  it("removes a direction-specific tail when direction changes", () => {
    const normalized = normalizeUrlState({
      ...DEFAULT_URL_STATE,
      dir: "rx",
      path: ["pcs", "pcs-6466"],
    });
    expect(normalized.path).toEqual(["pcs"]);
  });

  it("clamps walkthrough stages for the selected direction", () => {
    const normalized = normalizeUrlState({
      ...DEFAULT_URL_STATE,
      stepping: true,
      stepIndex: 999,
    });
    expect(normalized.stepIndex).toBe(8);
  });

  it("retains the article location while the walkthrough is active", () => {
    const normalized = normalizeUrlState({
      ...DEFAULT_URL_STATE,
      path: ["pcs"],
      stepping: true,
    });
    expect(normalized.path).toEqual(["pcs"]);
  });

  it("compares normalized state by value", () => {
    expect(statesEqual(DEFAULT_URL_STATE, { ...DEFAULT_URL_STATE })).toBe(true);
  });
});
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run:

```bash
npx vitest run test/url-state.test.ts
```

Expected: FAIL because normalization helpers do not exist.

- [ ] **Step 3: Implement topic and walkthrough normalization**

Add imports and helpers to `src/navigation/urlState.ts`:

```ts
import { DATA } from "../data/stack";
import { stagesFor } from "../data/stepper";
import { rawKids } from "../data/tree";
import type { StackNode } from "../types";

function directionAllows(node: StackNode, dir: NavigationDir): boolean {
  return !node.dir || node.dir === "both" || node.dir === dir;
}

function validPath(path: string[], dir: NavigationDir): string[] {
  if (!path.length || !DATA[path[0]] || !directionAllows(DATA[path[0]], dir)) return [];
  const valid = [path[0]];
  let node = DATA[path[0]];
  for (const id of path.slice(1)) {
    const child = rawKids(node).find((candidate) => candidate.id === id && directionAllows(candidate, dir));
    if (!child) break;
    valid.push(id);
    node = child;
  }
  return valid;
}

export function normalizeUrlState(state: UrlNavigationState): UrlNavigationState {
  const maxStep = Math.max(0, stagesFor(state.dir).length - 1);
  return {
    ...state,
    path: validPath(state.path, state.dir),
    stepIndex: Math.min(maxStep, Math.max(0, state.stepIndex)),
  };
}

export function statesEqual(a: UrlNavigationState, b: UrlNavigationState): boolean {
  return (
    a.rate === b.rate &&
    a.dir === b.dir &&
    a.gen === b.gen &&
    a.stepping === b.stepping &&
    a.stepIndex === b.stepIndex &&
    a.path.join("/") === b.path.join("/")
  );
}
```

Change `decodeUrlState` to return the normalized parsed object:

```ts
return normalizeUrlState({
  rate: rateValue && rates.includes(rateValue) ? rateValue : "400G",
  dir: dirValue && dirs.includes(dirValue) ? dirValue : "tx",
  gen: genValue && generations.includes(genValue) ? genValue : "100",
  path: (params.get("topic") || "").split("/").filter(Boolean),
  stepping: params.get("view") === "frame",
  stepIndex: Number.isFinite(rawStep) && rawStep >= 0 ? rawStep : 0,
});
```

- [ ] **Step 4: Run the focused and full tests**

Run:

```bash
npx vitest run test/url-state.test.ts
npm test
```

Expected: all tests PASS.

- [ ] **Step 5: Commit validation**

```bash
git add src/navigation/urlState.ts test/url-state.test.ts
git commit -m "feat: validate deep-linked learning state"
```

---

### Task 3: Add a native History API synchronization hook

**Files:**
- Create: `src/navigation/useUrlNavigation.ts`
- Create: `test/browser-navigation.test.ts`

**Interfaces:**
- Consumes: `UrlNavigationState`, `decodeUrlState`, `encodeUrlState`, `normalizeUrlState`, and `statesEqual`.
- Produces: `HistoryMode`, `buildNavigationHref(state, pathname, hash)`, and `useUrlNavigation()`.

- [ ] **Step 1: Write failing URL-writing tests**

Create `test/browser-navigation.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildNavigationHref } from "../src/navigation/useUrlNavigation";
import { DEFAULT_URL_STATE } from "../src/navigation/urlState";

describe("browser navigation href", () => {
  it("preserves the GitHub Pages base path", () => {
    expect(
      buildNavigationHref(
        { ...DEFAULT_URL_STATE, path: ["pcs"] },
        "/ethernet-onboarding/",
        "",
      ),
    ).toBe("/ethernet-onboarding/?topic=pcs");
  });

  it("drops stale hashes while retaining the current path", () => {
    expect(buildNavigationHref(DEFAULT_URL_STATE, "/ethernet-onboarding/", "#old")).toBe(
      "/ethernet-onboarding/",
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npx vitest run test/browser-navigation.test.ts
```

Expected: FAIL because `useUrlNavigation.ts` does not exist.

- [ ] **Step 3: Implement the history synchronization hook**

Create `src/navigation/useUrlNavigation.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from "react";
import {
  decodeUrlState,
  encodeUrlState,
  normalizeUrlState,
  statesEqual,
  type UrlNavigationState,
} from "./urlState";

export type HistoryMode = "push" | "replace";
export type NavigationPatch = Partial<UrlNavigationState>;

export function buildNavigationHref(
  state: UrlNavigationState,
  pathname: string,
  _hash: string,
): string {
  return `${pathname}${encodeUrlState(state)}`;
}

export function useUrlNavigation(): [
  UrlNavigationState,
  (patch: NavigationPatch | ((current: UrlNavigationState) => NavigationPatch), mode?: HistoryMode) => void,
] {
  const [state, setState] = useState<UrlNavigationState>(() =>
    normalizeUrlState(decodeUrlState(window.location.search)),
  );
  const stateRef = useRef(state);

  const navigate = useCallback(
    (
      patch: NavigationPatch | ((current: UrlNavigationState) => NavigationPatch),
      mode: HistoryMode = "push",
    ) => {
      const current = stateRef.current;
      const resolved = typeof patch === "function" ? patch(current) : patch;
      const next = normalizeUrlState({ ...current, ...resolved });
      if (statesEqual(current, next)) return;
      const href = buildNavigationHref(next, window.location.pathname, window.location.hash);
      window.history[mode === "push" ? "pushState" : "replaceState"]({ ethernetOnboarding: true }, "", href);
      stateRef.current = next;
      setState(next);
    },
    [],
  );

  useEffect(() => {
    const onPopState = () => {
      const next = decodeUrlState(window.location.search);
      stateRef.current = next;
      setState(next);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const canonical = buildNavigationHref(state, window.location.pathname, window.location.hash);
    const current = `${window.location.pathname}${window.location.search}`;
    if (canonical !== current) {
      window.history.replaceState({ ethernetOnboarding: true }, "", canonical);
    }
  }, []);

  return [state, navigate];
}
```

- [ ] **Step 4: Run focused tests and type checking**

Run:

```bash
npx vitest run test/browser-navigation.test.ts
npm run typecheck
```

Expected: tests and TypeScript checking PASS.

- [ ] **Step 5: Commit the hook**

```bash
git add src/navigation/useUrlNavigation.ts test/browser-navigation.test.ts
git commit -m "feat: synchronize learning state with browser history"
```

---

### Task 4: Migrate App navigation to the synchronized state

**Files:**
- Modify: `src/App.tsx`
- Modify: `test/ui-refinements.test.mjs`

**Interfaces:**
- Consumes: `useUrlNavigation()` from Task 3.
- Produces: history-aware rate, direction, lane-rate, topic, breadcrumb, walkthrough, and Escape transitions.

- [ ] **Step 1: Add failing source-level integration assertions**

Append to `test/ui-refinements.test.mjs`:

```js
test("app navigation is synchronized with URL history", async () => {
  const app = await source("src/App.tsx");

  assert.match(app, /useUrlNavigation/);
  assert.match(app, /navigate\(\{ rate: r \}, "replace"\)/);
  assert.match(app, /navigate\(\{ path: \[id\], stepping: false \}, "push"\)/);
  assert.match(app, /navigate\(\{ stepIndex: index \}, "replace"\)/);
});
```

- [ ] **Step 2: Run the assertion to verify it fails**

Run:

```bash
node --test test/ui-refinements.test.mjs
```

Expected: FAIL because `App.tsx` still uses independent local state.

- [ ] **Step 3: Replace independent navigation state with the hook**

In `src/App.tsx`, replace the six navigation `useState` calls with:

```ts
import { useUrlNavigation } from "./navigation/useUrlNavigation";

const [navigation, navigate] = useUrlNavigation();
const { rate, dir, gen, path, stepping, stepIndex } = navigation;
```

Keep `visited` as independent local state because durable progress is outside recommendation 1.

- [ ] **Step 4: Convert global configuration changes to replace transitions**

Pass explicit callbacks to `Header`:

```tsx
<Header
  rate={rate}
  setRate={(r) => navigate({ rate: r }, "replace")}
  dir={dir}
  setDir={(d) => changeDir(d)}
  gen={gen}
  setGen={(g) => navigate({ gen: g }, "replace")}
  stepping={stepping}
  toggleStep={() => navigate({ stepping: !stepping }, "push")}
  read={visited.size}
  total={TRACKABLE}
/>
```

Update direction changes so normalization prunes direction-specific descendants:

```ts
const changeDir = (d: Dir) => {
  navigate({ dir: d as "tx" | "rx", stepIndex: 0 }, "replace");
};
```

- [ ] **Step 5: Convert topic and breadcrumb transitions to push transitions**

Replace navigation helpers with:

```ts
const openTop = (id: string) => navigate({ path: [id], stepping: false }, "push");

const push = (id: string) => {
  markRead(id);
  navigate((current) => ({ path: current.path.concat(id), stepping: false }), "push");
};

const upTo = (i: number) =>
  navigate((current) => ({ path: current.path.slice(0, i), stepping: false }), "push");
```

Use `navigate({ path: [] }, "push")` for the root breadcrumb. Update `DrillCanvas.onPick` to calculate the next path from the current state and push it.

- [ ] **Step 6: Convert walkthrough transitions**

Keep stage changes within one history entry:

```tsx
<Stepper
  rate={rate}
  dir={dir}
  gen={gen}
  index={stepIndex}
  onIndexChange={(index) => navigate({ stepIndex: index }, "replace")}
  onExit={() => navigate({ stepping: false }, "push")}
  onNavigate={(nextPath) => {
    if (nextPath.length) markRead(nextPath[nextPath.length - 1]);
    navigate({ stepping: false, path: nextPath }, "push");
  }}
/>
```

- [ ] **Step 7: Convert Escape behavior**

Replace direct setters in the key handler:

```ts
useEffect(() => {
  const onKey = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    if (stepping) {
      navigate({ stepping: false }, "push");
    } else if (path.length) {
      navigate({ path: path.slice(0, -1) }, "push");
    }
  };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}, [navigate, path, stepping]);
```

- [ ] **Step 8: Run integration assertions, unit tests, and build**

Run:

```bash
npm test
npm run build
```

Expected: all tests PASS and the production build completes without TypeScript errors.

Update the existing walkthrough-state source test to assert the new state ownership instead of requiring the removed local setter:

```js
assert.match(app, /const \{ rate, dir, gen, path, stepping, stepIndex \} = navigation/);
assert.match(app, /index=\{stepIndex\}/);
```

Keep the existing assertion for the `Stepper` `onIndexChange` prop. Browser history writes must remain outside React state-updater callbacks so StrictMode cannot duplicate history entries.

- [ ] **Step 9: Commit the App migration**

```bash
git add src/App.tsx test/ui-refinements.test.mjs
git commit -m "feat: make topic navigation history aware"
```

---

### Task 5: Add state-aware document titles

**Files:**
- Create: `src/navigation/documentTitle.ts`
- Create: `test/document-title.test.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `UrlNavigationState`, `nodeAt`, and `stagesFor`.
- Produces: `documentTitleFor(state)`.

- [ ] **Step 1: Write failing title tests**

Create `test/document-title.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { documentTitleFor } from "../src/navigation/documentTitle";
import { DEFAULT_URL_STATE } from "../src/navigation/urlState";

describe("document title", () => {
  it("uses the product title at the root", () => {
    expect(documentTitleFor(DEFAULT_URL_STATE)).toBe("Ethernet Onboarding");
  });

  it("names the current topic", () => {
    expect(documentTitleFor({ ...DEFAULT_URL_STATE, path: ["pcs"] })).toBe(
      "PCS | Ethernet Onboarding",
    );
  });

  it("names the current walkthrough stage", () => {
    expect(
      documentTitleFor({ ...DEFAULT_URL_STATE, stepping: true, stepIndex: 1 }),
    ).toBe("Coded into 66-bit blocks | Follow a frame | Ethernet Onboarding");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
npx vitest run test/document-title.test.ts
```

Expected: FAIL because `documentTitle.ts` does not exist.

- [ ] **Step 3: Implement title derivation**

Create `src/navigation/documentTitle.ts`:

```ts
import { stagesFor } from "../data/stepper";
import { nodeAt } from "../data/tree";
import type { UrlNavigationState } from "./urlState";

export function documentTitleFor(state: UrlNavigationState): string {
  if (state.stepping) {
    const stages = stagesFor(state.dir);
    const stage = stages[Math.min(state.stepIndex, stages.length - 1)];
    return `${stage.title} | Follow a frame | Ethernet Onboarding`;
  }
  const node = nodeAt(state.path);
  return node ? `${node.name} | Ethernet Onboarding` : "Ethernet Onboarding";
}
```

- [ ] **Step 4: Synchronize the browser title in App**

Import the helper in `src/App.tsx` and add:

```ts
import { documentTitleFor } from "./navigation/documentTitle";

useEffect(() => {
  document.title = documentTitleFor(navigation);
}, [navigation]);
```

- [ ] **Step 5: Run title tests, full tests, and build**

Run:

```bash
npx vitest run test/document-title.test.ts
npm test
npm run build
```

Expected: all tests PASS and the production build completes.

- [ ] **Step 6: Commit document titles**

```bash
git add src/navigation/documentTitle.ts test/document-title.test.ts src/App.tsx
git commit -m "feat: title shared learning locations"
```

---

### Task 6: Verify deep links, history, and deployment behavior

**Files:**
- Modify: `README.md`
- Modify: `test/ui-refinements.test.mjs`

**Interfaces:**
- Consumes: the completed URL contract and production build.
- Produces: documented shareable-link behavior and a repeatable acceptance checklist.

- [ ] **Step 1: Add a regression assertion for the GitHub Pages strategy**

Append to `test/ui-refinements.test.mjs`:

```js
test("navigation keeps deep links on the GitHub Pages root", async () => {
  const navigation = await source("src/navigation/useUrlNavigation.ts");
  const vite = await source("vite.config.ts");

  assert.match(navigation, /window\.location\.pathname/);
  assert.match(navigation, /URLSearchParams|encodeUrlState/);
  assert.match(vite, /base: command === "build" \? "\/ethernet-onboarding\/" : "\/"/);
});
```

- [ ] **Step 2: Document shareable URLs**

Add a short `Shareable locations` section to `README.md`:

```md
### Shareable locations

The current topic, rate, direction, physical lane rate, and frame-walkthrough stage are stored in the URL query string. Copying the browser URL preserves the current learning location. Browser Back and Forward restore topic and view changes, while rate and stage adjustments update the current history entry.
```

- [ ] **Step 3: Run automated verification**

Run:

```bash
npm test
npm run build
```

Expected: all tests PASS and Vite produces `dist/` successfully.

- [ ] **Step 4: Run desktop acceptance checks in the development server**

Start the app:

```bash
npm run dev
```

Verify each case in the browser:

1. Open PCS, then Alignment markers. Confirm `topic=pcs%2Fpcs-am` appears.
2. Copy the URL into a new tab. Confirm the same topic and configuration render.
3. Change to 800G and RX. Reload. Confirm both settings persist.
4. Navigate into three topics. Use Back twice and Forward once. Confirm the article, map highlight, and breadcrumb all restore correctly.
5. Open Follow a Frame and advance to stage 4. Confirm `view=frame&step=4` and reload restoration.
6. Paste `?topic=pcs%2Fnot-real&rate=fast&step=999`. Confirm the app normalizes safely and rewrites the URL.
7. Confirm root, topic, and walkthrough pages each set an accurate browser-tab title.

- [ ] **Step 5: Preview the production build under the configured base path**

Run:

```bash
npm run preview
```

Open the preview URL under `/ethernet-onboarding/` and repeat checks 1, 2, 4, and 5. Confirm no navigation produces a server-side 404.

- [ ] **Step 6: Commit documentation and acceptance coverage**

```bash
git add README.md test/ui-refinements.test.mjs
git commit -m "docs: document shareable learning URLs"
```

---

### Task 7: Build the complete local topic catalog and ranked search

**Files:**
- Create: `src/search/topicCatalog.ts`
- Create: `test/topic-catalog.test.ts`

**Interfaces:**
- Consumes: `DATA`, `StackNode`, `Dir`, and `rawKids(node)`.
- Produces: `TopicEntry`, `buildTopicCatalog(data?: Record<string, StackNode>): TopicEntry[]`, `visibleTopics(catalog: TopicEntry[], dir: Dir): TopicEntry[]`, and `searchTopics(catalog: TopicEntry[], query: string, dir: Dir): TopicEntry[]`.
- `TopicEntry.path` is the exact node-ID path consumed by `navigate({ path }, "push")`, not a display-label slug.

- [ ] **Step 1: Write failing catalog and ranking tests**

Create `test/topic-catalog.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DATA } from "../src/data/stack";
import { TRACKABLE } from "../src/data/tree";
import type { StackNode } from "../src/types";
import { buildTopicCatalog, searchTopics, visibleTopics } from "../src/search/topicCatalog";

const fixture: Record<string, StackNode> = {
  pcs: {
    id: "pcs", name: "PCS", alias: "Physical Coding Sublayer", clause: { all: "Clause 119" },
    terms: { fingerprint: "A per-lane identity" },
    subs: [{ id: "tx-stage", name: "Transmit stage", dir: "tx", sections: [
      { id: "outline", name: "Shared child", written: false },
    ] }],
  },
  other: { id: "other", name: "Other", body: "PCS is mentioned here." },
};

describe("topic catalog", () => {
  it("includes every top-level topic and descendant once", () => {
    const catalog = buildTopicCatalog(DATA);
    expect(catalog.length).toBe(TRACKABLE + Object.keys(DATA).length);
    expect(new Set(catalog.map(topic => topic.path.join("/"))).size).toBe(catalog.length);
  });
  it("keeps exact paths and outline status", () => {
    const outline = buildTopicCatalog(fixture).find(topic => topic.id === "outline")!;
    expect(outline.path).toEqual(["pcs", "tx-stage", "outline"]);
    expect(outline.written).toBe(false);
  });
  it("filters direction-specific ancestors, not just the leaf", () => {
    expect(visibleTopics(buildTopicCatalog(fixture), "rx").map(topic => topic.id))
      .toEqual(["pcs", "other"]);
  });
  it("ranks exact names before body-only mentions", () => {
    expect(searchTopics(buildTopicCatalog(fixture), "pcs", "tx")[0].id).toBe("pcs");
  });
  it("finds aliases, clauses, and glossary definitions", () => {
    const catalog = buildTopicCatalog(fixture);
    for (const query of ["physical coding", "Clause 119", "fingerprint", "per-lane identity"]) {
      expect(searchTopics(catalog, query, "tx")[0].id).toBe("pcs");
    }
  });
  it("normalizes whitespace and case, and returns no false matches", () => {
    const catalog = buildTopicCatalog(fixture);
    expect(searchTopics(catalog, "  PHYSICAL   coding  ", "tx")[0].id).toBe("pcs");
    expect(searchTopics(catalog, "unfindableword", "tx")).toEqual([]);
    expect(searchTopics(catalog, "   ", "tx")).toEqual(visibleTopics(catalog, "tx"));
  });
});
```

- [ ] **Step 2: Run the test to confirm the missing module failure**

Run: `npx vitest run test/topic-catalog.test.ts`

Expected: FAIL because `src/search/topicCatalog.ts` does not exist.

- [ ] **Step 3: Implement the catalog and deterministic ranking**

Create `src/search/topicCatalog.ts`:

```ts
import { DATA } from "../data/stack";
import { rawKids } from "../data/tree";
import type { Dir, StackNode } from "../types";

export interface TopicEntry {
  id: string;
  name: string;
  alias: string;
  summary: string;
  path: string[];
  breadcrumb: string;
  layer: string;
  layerName: string;
  written: boolean;
  directions: Dir[];
  nameText: string;
  searchText: string;
}

const normalize = (text: string) => text.toLowerCase().replace(/\s+/g, " ").trim();

export function buildTopicCatalog(data: Record<string, StackNode> = DATA): TopicEntry[] {
  const catalog: TopicEntry[] = [];
  const walk = (node: StackNode, path: string[], labels: string[], directions: Dir[], top: StackNode) => {
    const chain = [...directions, node.dir || "both"];
    catalog.push({
      id: node.id, name: node.name, alias: node.alias || "", summary: node.summary || "",
      path, breadcrumb: labels.join(" / "), layer: top.id, layerName: top.name,
      written: node.written !== false, directions: chain,
      nameText: normalize(node.name),
      searchText: normalize([
        node.name, node.alias, node.summary, node.intro, node.body,
        ...Object.values(node.clause || {}),
        ...Object.entries(node.terms || {}).flat(),
      ].filter(Boolean).join(" ")),
    });
    rawKids(node).forEach(child => walk(child, [...path, child.id], [...labels, child.name], chain, top));
  };
  Object.values(data).forEach(top => walk(top, [top.id], [top.name], [], top));
  return catalog;
}

export function visibleTopics(catalog: TopicEntry[], dir: Dir): TopicEntry[] {
  return catalog.filter(topic => topic.directions.every(value => value === "both" || value === dir));
}

export function searchTopics(catalog: TopicEntry[], query: string, dir: Dir): TopicEntry[] {
  const text = normalize(query);
  const topics = visibleTopics(catalog, dir);
  if (!text) return topics;
  const tokens = text.split(" ");
  const score = (topic: TopicEntry) => topic.nameText === text ? 0
    : topic.nameText.startsWith(text) ? 1
    : normalize(topic.alias).includes(text) ? 2
    : topic.nameText.includes(text) ? 3 : 4;
  return topics.filter(topic => tokens.every(token => topic.searchText.includes(token)))
    .sort((a, b) => score(a) - score(b) || a.breadcrumb.localeCompare(b.breadcrumb));
}
```

- [ ] **Step 4: Verify catalog behavior and existing functionality**

Run: `npm test` and `npm run build`.

Expected: all catalog, navigation, and existing refinement tests PASS; build PASS.

- [ ] **Step 5: Commit the search model**

```bash
git add src/search/topicCatalog.ts test/topic-catalog.test.ts
git commit -m "feat: catalog and search all learning topics"
```

---

### Task 8: Add bounded recent-topic and resume data

**Files:**
- Create: `src/search/recentTopics.ts`
- Create: `test/recent-topics.test.ts`

**Interfaces:**
- Consumes: `TopicEntry[]` from Task 7.
- Produces: `RECENT_TOPICS_KEY`, `parseRecentTopics(raw: string | null, catalog: TopicEntry[]): string[][]`, and `recordRecentTopic(recent: string[][], path: string[]): string[][]`.
- The first valid recent path is the resume shortcut. This does not mark topics complete.

- [ ] **Step 1: Write failing recent-topic tests**

Create `test/recent-topics.test.ts`:

```ts
import { expect, it } from "vitest";
import { buildTopicCatalog } from "../src/search/topicCatalog";
import { parseRecentTopics, recordRecentTopic } from "../src/search/recentTopics";

it("ignores corrupt or stale storage", () => {
  const catalog = buildTopicCatalog();
  expect(parseRecentTopics("broken-json", catalog)).toEqual([]);
  expect(parseRecentTopics(JSON.stringify([["pcs"], ["missing"], 42]), catalog)).toEqual([["pcs"]]);
});
it("moves a revisited topic to the front and caps history at 8", () => {
  const paths = Array.from({ length: 9 }, (_, index) => [`topic-${index}`]);
  const updated = recordRecentTopic(paths, ["topic-4"]);
  expect(updated[0]).toEqual(["topic-4"]);
  expect(updated.length).toBe(8);
  expect(updated.filter(path => path[0] === "topic-4").length).toBe(1);
});
it("does not record the root", () => {
  expect(recordRecentTopic([["pcs"]], [])).toEqual([["pcs"]]);
});
```

- [ ] **Step 2: Confirm the test fails**

Run: `npx vitest run test/recent-topics.test.ts`

Expected: FAIL because `recentTopics.ts` is missing.

- [ ] **Step 3: Implement safe parsing and bounded recency**

Create `src/search/recentTopics.ts`:

```ts
import type { TopicEntry } from "./topicCatalog";

export const RECENT_TOPICS_KEY = "ethernet-onboarding:recent-topics:v1";

export function recordRecentTopic(recent: string[][], path: string[]): string[][] {
  if (!path.length) return recent;
  return [path, ...recent.filter(item => item.join("/") !== path.join("/"))].slice(0, 8);
}

export function parseRecentTopics(raw: string | null, catalog: TopicEntry[]): string[][] {
  try {
    const parsed: unknown = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return [];
    const valid = new Set(catalog.map(topic => topic.path.join("/")));
    const paths = parsed.filter((item): item is string[] =>
      Array.isArray(item) && item.every(value => typeof value === "string") && valid.has(item.join("/")));
    return paths.filter((path, index) => paths.findIndex(item => item.join("/") === path.join("/")) === index).slice(0, 8);
  } catch {
    return [];
  }
}
```

- [ ] **Step 4: Run the full tests**

Run: `npm test`.

Expected: all tests PASS.

- [ ] **Step 5: Commit the recent-topic model**

```bash
git add src/search/recentTopics.ts test/recent-topics.test.ts
git commit -m "feat: retain recent topic paths safely"
```

---

### Task 9: Expose accessible search, grouped index, and resume navigation

**Files:**
- Create: `src/components/TopicExplorer.tsx`
- Create: `test/topic-explorer.test.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/Header.tsx`
- Modify: `src/styles/global.css`
- Modify: `README.md`

**Interfaces:**
- Consumes: `TopicEntry[]`, `searchTopics`, `visibleTopics`, recent paths, and the `navigate` callback from Tasks 3-4.
- Produces: `TopicExplorer({ catalog, dir, recent, onSelect }: { catalog: TopicEntry[]; dir: Dir; recent: string[][]; onSelect: (path: string[]) => void }): JSX.Element`.
- Extend Header props with `catalog: TopicEntry[]`, `recent: string[][]`, and `onTopicSelect: (path: string[]) => void`.

- [ ] **Step 1: Write the failing render test**

Create `test/topic-explorer.test.ts`:

```ts
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import TopicExplorer from "../src/components/TopicExplorer";
import { buildTopicCatalog } from "../src/search/topicCatalog";

it("renders a labelled discovery disclosure with its collapsed state", () => {
  const html = renderToStaticMarkup(createElement(TopicExplorer, {
    catalog: buildTopicCatalog(), dir: "tx", recent: [], onSelect: () => {},
  }));
  expect(html).toContain("Search topics");
  expect(html).toContain('aria-expanded="false"');
  expect(html).toContain('aria-controls="topic-explorer"');
});
```

- [ ] **Step 2: Verify the missing-component failure**

Run: `npx vitest run test/topic-explorer.test.ts`.

Expected: FAIL because `TopicExplorer.tsx` does not exist.

- [ ] **Step 3: Implement the non-modal discovery disclosure**

Create `src/components/TopicExplorer.tsx`:

```tsx
import { useEffect, useRef, useState } from "react";
import type { Dir } from "../types";
import { searchTopics, visibleTopics, type TopicEntry } from "../search/topicCatalog";

export default function TopicExplorer({ catalog, dir, recent, onSelect }: {
  catalog: TopicEntry[];
  dir: Dir;
  recent: string[][];
  onSelect: (path: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [panelTop, setPanelTop] = useState(100);
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const close = () => { setOpen(false); trigger.current?.focus(); };
  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  useEffect(() => {
    if (!open) return;
    const header = trigger.current?.closest("header");
    if (!header) return;
    const measure = () => setPanelTop(header.getBoundingClientRect().bottom + 12);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    return () => observer.disconnect();
  }, [open]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault(); setOpen(true); input.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  const results = searchTopics(catalog, query, dir);
  const available = visibleTopics(catalog, dir);
  const recentEntries = recent.map(path => available.find(topic => topic.path.join("/") === path.join("/")))
    .filter((topic): topic is TopicEntry => Boolean(topic));
  const groups = [...new Set(results.map(topic => topic.layer))];
  const pick = (topic: TopicEntry) => { onSelect([...topic.path]); close(); };
  return <div className="topic-explorer">
    <button ref={trigger} className="btn" aria-expanded={open} aria-controls="topic-explorer"
      onClick={() => open ? close() : setOpen(true)}>Search topics</button>
    {open && <section id="topic-explorer" className="topic-explorer__panel" aria-label="Topic discovery"
      style={{ top: panelTop, maxHeight: `calc(100vh - ${panelTop + 24}px)` }}
      onKeyDown={event => {
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); }
      }}>
      <div className="topic-explorer__head"><h2>Find a topic</h2><button className="btn" onClick={close}>Close search</button></div>
      <label htmlFor="topic-query">Search by topic, glossary term, or clause</label>
      <input ref={input} id="topic-query" type="search" value={query} onChange={event => setQuery(event.target.value)} />
      <p className="topic-explorer__status" role="status">{results.length} topics in {dir.toUpperCase()} direction</p>
      {!query.trim() && recentEntries.length > 0 && <section aria-label="Recently viewed topics">
        <h3>Recently viewed</h3>
        <button className="btn" onClick={() => pick(recentEntries[0])}>Resume: {recentEntries[0].name}</button>
        <ul>{recentEntries.slice(1).map(topic => <li key={topic.path.join("/")}>
          <button className="topic-explorer__result" onClick={() => pick(topic)}>{topic.breadcrumb}</button>
        </li>)}</ul>
      </section>}
      {results.length === 0 && <p>No topics match. Try a shorter term or switch direction in the header.</p>}
      {groups.map(layer => <section key={layer} aria-label={results.find(topic => topic.layer === layer)!.layerName}>
        <h3>{results.find(topic => topic.layer === layer)!.layerName}</h3>
        <ul>{results.filter(topic => topic.layer === layer).map(topic => <li key={topic.path.join("/")}>
          <button className="topic-explorer__result" onClick={() => pick(topic)}>
            <strong>{topic.name}</strong><span>{topic.breadcrumb}{topic.written ? "" : " · Outline"}</span>
            {topic.summary && <span>{topic.summary}</span>}
          </button>
        </li>)}</ul>
      </section>)}
    </section>}
  </div>;
}
```

This disclosure is not a dialog and must not trap focus. Tab naturally traverses its input and buttons. Escape closes only search, not the underlying topic. The unfiltered state is the complete grouped index for the active direction; do not truncate it to a result limit.

- [ ] **Step 4: Connect the explorer and local recent history in App and Header**

In App, import `buildTopicCatalog`, `parseRecentTopics`, `recordRecentTopic`, and `RECENT_TOPICS_KEY` from Tasks 7-8. Add inside App:

```ts
const catalog = useMemo(() => buildTopicCatalog(), []);
const [recent, setRecent] = useState<string[][]>(() => {
  try { return parseRecentTopics(localStorage.getItem(RECENT_TOPICS_KEY), catalog); }
  catch { return []; }
});
useEffect(() => {
  if (!stepping && path.length) setRecent(current => recordRecentTopic(current, path));
}, [path, stepping]);
useEffect(() => {
  try { localStorage.setItem(RECENT_TOPICS_KEY, JSON.stringify(recent)); }
  catch { /* Discovery remains available when storage is blocked. */ }
}, [recent]);
const selectTopic = (nextPath: string[]) => {
  markRead(nextPath[nextPath.length - 1]);
  navigate({ path: nextPath, stepping: false }, "push");
};
```

Add `catalog={catalog}`, `recent={recent}`, and `onTopicSelect={selectTopic}` to the existing Header call. In Header, import `TopicEntry` and `TopicExplorer`, add the three typed props to `Props` and the destructured function arguments, then add inside `.header__controls`:

```tsx
<div>
  <div className="control-label">Topics</div>
  <TopicExplorer catalog={catalog} dir={dir} recent={recent} onSelect={onTopicSelect} />
</div>
```

- [ ] **Step 5: Add theme-aware desktop styling**

Append to `src/styles/global.css`:

```css
.topic-explorer__panel {
  position: fixed;
  top: 100px;
  right: 24px;
  z-index: 40;
  width: min(640px, calc(100vw - 48px));
  max-height: calc(100vh - 124px);
  overflow: auto;
  padding: 22px;
  border: 1px solid var(--rule);
  border-radius: 10px;
  background: var(--ink2);
  box-shadow: var(--shadow);
}
.topic-explorer__head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.topic-explorer__head h2 { margin: 0 0 12px; font-size: 21px; }
.topic-explorer__panel label { display: block; color: var(--text); margin: 10px 0 6px; }
.topic-explorer__panel input { width: 100%; padding: 10px 12px; font: inherit; color: var(--text); background: var(--ink); border: 1px solid var(--rule); border-radius: 6px; }
.topic-explorer__status { color: var(--dim); font-size: 13px; }
.topic-explorer__panel h3 { font-size: 14px; margin: 20px 0 8px; }
.topic-explorer__panel ul { list-style: none; margin: 0; padding: 0; }
.topic-explorer__result { display: grid; gap: 4px; width: 100%; text-align: left; font: inherit; padding: 10px; background: transparent; color: var(--text); border: 0; border-bottom: 1px solid var(--rule-soft); cursor: pointer; border-radius: 5px; }
.topic-explorer__result span { color: var(--dim); font-size: 12px; }
.topic-explorer__result:hover { background: var(--ink3); }
```

The component measures the actual header height with `ResizeObserver`, so the panel remains below a wrapped header. Keep all existing header controls available.

- [ ] **Step 6: Document discovery and run automated verification**

Add to README:

```md
### Finding topics

Use Search topics or Ctrl/Cmd+K to search names, aliases, summaries, article text, glossary terms, and clause references. Clear the query to browse the complete topic index for the current direction. Recent topics and Resume are stored locally in this browser; they are convenience history, not completion tracking. Escape closes search without leaving the current topic.
```

Run: `npm test` and `npm run build`.

Expected: all tests PASS, build PASS, and no change to verified facts.

- [ ] **Step 7: Verify desktop interactions and URL integration in both themes**

Run `npm run dev`, then verify:

1. Open Search topics using the button and Ctrl/Cmd+K; input receives focus.
2. Clear the query; every active-direction topic appears exactly once, grouped under its top-level layer.
3. Search `PCS`, `Clause 119`, a glossary term, and an unmatched word. Confirm ranked results and a useful empty state.
4. Set 800G and 200G per lane, then choose a TX topic. Confirm the correct full path renders, configuration is preserved, and Browser Back returns to the previous location.
5. Switch to RX. Confirm TX-only descendants and descendants of TX-only parents are absent.
6. Close search with Escape. Confirm the selected topic does not climb one level and focus returns to Search topics.
7. Visit two topics and reload. Confirm Recent and Resume open valid paths with the active direction and configuration preserved.
8. Block localStorage using browser diagnostics. Confirm search and the topic index still work without exceptions.
9. Repeat opening, querying, keyboard traversal, and selection in light and dark themes at 1280 x 800 and 1440 x 900. Confirm visible focus, readable results, no panel/header overlap, and no clipped controls.
10. Run `npm run preview` after the build and select a result under `/ethernet-onboarding/`. Copy and reload its URL; confirm no server-side 404.

- [ ] **Step 8: Commit the discovery interface**

```bash
git add src/components/TopicExplorer.tsx src/components/Header.tsx src/App.tsx src/styles/global.css test/topic-explorer.test.ts README.md
git commit -m "feat: expose topic search index and resume shortcuts"
```

## Completion criteria

- Every valid topic can be opened from a copied URL.
- Reload preserves topic, rate, direction, lane rate, view, and walkthrough stage.
- Browser Back and Forward restore topic and view transitions.
- Invalid or stale URL values normalize without an error screen.
- The browser-tab title identifies the current topic or frame stage.
- GitHub Pages URLs remain rooted at `/ethernet-onboarding/` and do not require rewrite rules.
- Search finds names, aliases, summaries, article text, glossary terms/definitions, and clauses locally.
- The empty-query view shows a complete grouped index for the active direction, including clearly marked outlines.
- Keyboard opening, Tab traversal, Escape dismissal, and focus restoration work without changing the underlying topic.
- Search selection pushes the exact topic path, preserves rate and lane configuration, and works with Browser Back and reload.
- Valid recent topics and a resume shortcut survive reload; blocked or corrupt storage never prevents discovery.
- Recommendation 11 is not implemented.
- Existing behavior and all automated tests remain green.
