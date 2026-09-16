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

  assert.match(header, /Explore the Ethernet Stack/);
  assert.match(header, /className="header__byline">by Mishat/);
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

  assert.match(app, /const \[stepIndex, setStepIndex\] = useState\(0\)/);
  assert.match(app, /index=\{stepIndex\}/);
  assert.match(stepper, /onIndexChange: \(index: number\) => void/);
});

test("walkthrough footer shares the centered content alignment", async () => {
  const app = await source("src/App.tsx");
  const css = await source("src/styles/global.css");

  assert.match(app, /footer--step/);
  assert.match(css, /\.footer--step \.footer__inner/);
});

test("stack canvas gives lane labels breathing room and a consistent side-label scale", async () => {
  const canvas = await source("src/components/StackCanvas.tsx");

  assert.match(canvas, /BH = 62,\s*GAP = 42/);
  assert.match(canvas, /x=\{ASIDE_X \+ 11\} y=\{y \+ 22\} fill=\{C.dim\} fontSize="12"/);
  assert.match(canvas, /x=\{IFACE_X \+ 11\} y=\{y \+ 22\} fill=\{C.dim\} fontSize="12"/);
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
