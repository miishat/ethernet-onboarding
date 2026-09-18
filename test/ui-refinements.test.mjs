import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = async (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("alignment-marker diagram separates common and unique regions", async () => {
  const stageArt = await source("src/components/StageArt.tsx");

  assert.match(stageArt, /key="cm" x=\{56\} y=\{61\} width=\{36\}/);
  assert.match(stageArt, /key="um" x=\{102\} y=\{61\} width=\{32\}/);
});

test("header uses the Ethernet Stack subtitle and a title byline", async () => {
  const header = await source("src/components/Header.tsx");
  const app = await source("src/App.tsx");
  const css = await source("src/styles/global.css");

  assert.match(header, /Explore the Ethernet Stack/);
  assert.match(header, /className="header__byline">by Mishat/);
  assert.match(css, /\.header__byline\s*\{[^}]*font-style:\s*italic;/s);
  assert.doesNotMatch(header, /one sublayer at a time/);
  assert.doesNotMatch(app, /Made by Mishat/);
});

test("stepper names Medium consistently in its path caption", async () => {
  const rail = await source("src/components/StepperMiniStack.tsx");

  assert.match(rail, /"MAC → Medium"/);
  assert.match(rail, /"Medium → MAC"/);
});

test("progress uses a compact numeric label without a second read line", async () => {
  const progress = await source("src/components/ProgressMeter.tsx");

  assert.match(progress, /aria-label=\{"Learning progress: " \+ value \+ " of " \+ total\}/);
  assert.match(progress, /<b>\{value\}<\/b> \/ \{total\}/);
  assert.doesNotMatch(progress, /<br\s*\/>\s*\n\s*read/);
});

test("scrambler shows a direct data-to-line transformation and real exponent markup", async () => {
  const stageArt = await source("src/components/StageArt.tsx");
  const mathText = await source("src/components/MathText.tsx");

  assert.match(stageArt, /data: 00001111/);
  assert.match(stageArt, /line: 01101001/);
  assert.match(mathText, /<sup>\{power\[1\]\}<\/sup>/);
});

test("read-more navigation preserves the current walkthrough stage", async () => {
  const app = await source("src/App.tsx");
  const stepper = await source("src/components/Stepper.tsx");

  assert.match(app, /const \{ rate, dir, gen, path, stepping, stepIndex \} = navigation/);
  assert.match(app, /index=\{stepIndex\}/);
  assert.match(stepper, /onIndexChange: \(index: number\) => void/);
});

test("App controls synchronize navigation through URL history", async () => {
  const app = await source("src/App.tsx");

  assert.match(app, /import \{ useUrlNavigation \} from "\.\/navigation\/useUrlNavigation"/);
  assert.match(app, /const \[navigation, navigate\] = useUrlNavigation\(\)/);
  assert.match(app, /navigate\(\{ rate: r \}, "replace"\)/);
  assert.match(app, /navigate\(\{ gen: g \}, "replace"\)/);
  assert.match(app, /navigate\(\{ path: \[id\], stepping: false \}, "push"\)/);
  assert.match(app, /navigate\(\{ dir: d \}, "replace"\)/);
  assert.match(app, /navigate\(\{ stepIndex: index \}, "replace"\)/);
  assert.match(app, /navigate\(\{ stepping: !stepping \}, "push"\)/);
  assert.doesNotMatch(app, /set(?:Rate|Dir|Gen|Path|Stepping|StepIndex)\(/);
});

test("breadcrumb navigation exits walkthrough and pushes the selected prefix", async () => {
  const app = await source("src/App.tsx");

  assert.match(app, /navigate\(\{ path: path\.slice\(0, i\), stepping: false \}, "push"\)/);
  assert.match(app, /go: path\.length \? \(\) => upTo\(0\) : null/);
  assert.match(app, /if \(stepping\) \{\s*navigate\(\{ stepping: false \}, "push"\)/);
});

test("walkthrough footer shares the centered content alignment", async () => {
  const app = await source("src/App.tsx");
  const css = await source("src/styles/global.css");

  assert.match(app, /footer--step/);
  assert.match(css, /\.footer--step \.footer__inner/);
});

test("stack canvas gives lane labels breathing room and a consistent side-label scale", async () => {
  const canvas = await source("src/components/StackCanvas.tsx");

  assert.match(canvas, /BH = 70,\s*GAP = 42/);
  assert.match(canvas, /x=\{ASIDE_X \+ 11\} y=\{y \+ 22\} fill=\{C.dim\} fontSize="12"/);
  assert.match(canvas, /x=\{IFACE_X \+ 11\} y=\{y \+ 22\} fill=\{C.dim\} fontSize="12"/);
});

test("stack canvas labels lane domains on the correct sublayer boundaries", async () => {
  const canvas = await source("src/components/StackCanvas.tsx");

  assert.match(canvas, /function laneLabel\(from: string, to: string, rate: Rate, gen: LaneGen\)/);
  assert.match(canvas, /const boundary = \[from, to\]\.sort\(\)\.join\(":"\)/);
  assert.match(canvas, /boundary === "fec:pcs" \|\| boundary === "fec:pma"/);
  assert.match(canvas, /boundary === "pma:pmd" \|\| boundary === "medium:pmd"/);
  assert.match(canvas, /laneLabel\(id, order\[i \+ 1\], rate, gen\)/);
  assert.doesNotMatch(canvas, /laneLabel\(order\[i \+ 1\], rate, gen\)/);
});

test("side labels use title case and the opening copy distinguishes electrical from optical links", async () => {
  const stack = await source("src/data/stack.ts");
  const panel = await source("src/components/ContentPanel.tsx");

  assert.match(stack, /name: "Time Synchronization"/);
  assert.match(stack, /name: "Autoneg and Link Training"/);
  assert.match(stack, /name: "Retimed or Linear"/);
  assert.match(stack, /name: "Form Factors"/);
  assert.match(panel, /electrical backplane and copper links, not optical PMDs/);
});

test("stack labels use concise, rate-specific FEC and Medium clauses", async () => {
  const stack = await source("src/data/stack.ts");

  assert.match(stack, /id: "fec"[\s\S]*?"400G": "Clause 119", "800G": "Clause 172"/);
  assert.match(stack, /id: "medium"[\s\S]*?"400G": "Clause 121-124", "800G": "Clause 124; 802\.3df", "1\.6T": "Clauses 180-183 \(draft\)"/);
});

test("stack cards use compact references while retaining their draft marker", async () => {
  const canvas = await source("src/components/StackCanvas.tsx");

  assert.match(canvas, /function compactReference/);
  assert.match(canvas, /"Clause " \+ refs\.join\(" \+ "\) : reference/);
  assert.match(canvas, /\(draft\)/);
  assert.match(canvas, /y=\{y \+ 25\} textAnchor="end" fill=\{isDraft \? C\.signal : C\.dim\}/);
  assert.match(canvas, /y=\{y \+ 52\} fill=\{C\.diagram\}/);
});

test("stack card references preserve semicolon-separated IEEE standards", async () => {
  const canvas = await source("src/components/StackCanvas.tsx");

  assert.match(canvas, /split\(";"\)/);
  assert.match(canvas, /if \(!\/\^clauses\?\\b\/i\.test\(reference\)\) return reference;/);
  assert.match(canvas, /join\("; "\)/);
});

test("PMA card follows the selected per-lane speed for both clause and lane count", async () => {
  const canvas = await source("src/components/StackCanvas.tsx");

  assert.match(canvas, /function pmaCardValues\(rate: Rate, gen: LaneGen\)/);
  assert.match(canvas, /"800G".*gen === "100" \? "Clause 173" : "Clause 176"/s);
  assert.match(canvas, /laneInfo\(rate, gen\)\.phys \+ " lanes"/);
});

test("content references and inline definitions advertise their purpose", async () => {
  const panel = await source("src/components/ContentPanel.tsx");
  const prose = await source("src/components/Prose.tsx");

  assert.match(panel, /className="badge__label">Reference/);
  assert.match(prose, /aria-label=\{"Show definition of " \+ t\}/);
});

test("goodput copy uses frame occupancy", async () => {
  const header = await source("src/components/Header.tsx");
  const visuals = await source("src/data/visuals.ts");
  const stack = await source("src/data/stack.ts");

  assert.match(header, /"Step Through"/);
  assert.match(visuals, /title: "Minimum-frame occupancy"/);
  assert.match(visuals, /caption: "A minimum untagged frame occupies 84 octet times/);
  assert.match(stack, /\["Payload fraction", "46 \/ 84, about 55 percent"\]/);
  assert.match(stack, /\["Payload fraction", "about 97\.5 percent"\]/);
});

test("figure captions span their panel and compact labels use straight leaders", async () => {
  const css = await source("src/styles/global.css");
  const diagram = await source("src/components/Diagram.tsx");

  assert.match(css, /\.figure__caption\s*\{[^}]*max-width:\s*none;/s);
  assert.match(diagram, /x1=\{lblCx\} y1=\{y \+ bh \+ 2\} x2=\{lblCx\}/);
});

test("diagrams use a distinct cool accent and the prose scale stays compact", async () => {
  const palette = await source("src/theme/palette.ts");
  const diagram = await source("src/components/Diagram.tsx");
  const css = await source("src/styles/global.css");

  assert.match(palette, /diagram: "#78a9d5"/);
  assert.match(diagram, /C\.diagramWash/);
  assert.match(css, /\.prose p\s*\{[^}]*font-size:\s*14px;/s);
});

test("transcode illustrations label leading and control bits without a cramped ruler", async () => {
  const visuals = await source("src/data/visuals.ts");
  const diagram = await source("src/components/Diagram.tsx");

  assert.match(visuals, /"pcs-257-lead"[\s\S]*?ruler: false/);
  assert.match(visuals, /"pcs-257-control"[\s\S]*?type: "transcode"/);
  assert.match(diagram, /spec\.type === "transcode"/);
});

test("quizzes open on demand and replace the lesson with a return control", async () => {
  const panel = await source("src/components/ContentPanel.tsx");

  assert.match(panel, /const \[showQuiz, setShowQuiz\] = useState\(false\)/);
  assert.match(panel, /if \(showQuiz && node\.quiz\)/);
  assert.match(panel, /Back to lesson/);
  assert.match(panel, />\s*Check Yourself\s*</);
  assert.match(panel, /onClick=\{\(\) => setShowQuiz\(true\)\}/);
});

test("scrambling art avoids a redundant transition-pattern caption", async () => {
  const art = await source("src/components/StageArt.tsx");

  assert.doesNotMatch(art, /same data positions, a more transition-rich line pattern/);
});
