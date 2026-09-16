import type { Dir, LaneGen, Rate } from "../types";
import type { StackNode } from "../types";
import { DATA } from "../data/stack";
import { rawKids } from "../data/tree";
import { stagesFor } from "../data/stepper";

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

const rates: readonly Rate[] = ["400G", "800G", "1.6T"];
const directions: readonly NavigationDir[] = ["tx", "rx"];
const generations: readonly LaneGen[] = ["100", "200"];

function isRate(value: string | null): value is Rate {
  return value !== null && rates.includes(value as Rate);
}

function isDirection(value: string | null): value is NavigationDir {
  return value !== null && directions.includes(value as NavigationDir);
}

function isGeneration(value: string | null): value is LaneGen {
  return value !== null && generations.includes(value as LaneGen);
}

function permitsDirection(node: StackNode, dir: NavigationDir): boolean {
  const nodeDir = node.dir || "both";
  return nodeDir === "both" || nodeDir === dir;
}

/** Return a state whose topic path and walkthrough index are valid for its direction. */
export function normalizeUrlState(state: UrlNavigationState): UrlNavigationState {
  const dir = isDirection(state.dir) ? state.dir : DEFAULT_URL_STATE.dir;
  const path: string[] = [];
  let node: StackNode | null = null;

  for (let index = 0; index < state.path.length; index += 1) {
    const id = state.path[index];
    const candidate: StackNode | undefined = index === 0
      ? DATA[id]
      : rawKids(node).find((child) => child.id === id);
    if (!candidate || !permitsDirection(candidate, dir)) break;
    path.push(id);
    node = candidate;
  }

  const maxStepIndex = stagesFor(dir).length - 1;
  const stepIndex = Number.isFinite(state.stepIndex)
    ? Math.min(maxStepIndex, Math.max(0, Math.floor(state.stepIndex)))
    : 0;

  return { ...state, dir, path, stepIndex };
}

export function statesEqual(a: UrlNavigationState, b: UrlNavigationState): boolean {
  return a.rate === b.rate
    && a.dir === b.dir
    && a.gen === b.gen
    && a.stepping === b.stepping
    && a.stepIndex === b.stepIndex
    && a.path.length === b.path.length
    && a.path.every((id, index) => id === b.path[index]);
}

export function decodeUrlState(search: string): UrlNavigationState {
  const params = new URLSearchParams(search);
  const topic = params.get("topic");
  const view = params.get("view");
  const parsedStep = Number(params.get("step"));
  const rate = params.get("rate");
  const dir = params.get("dir");
  const gen = params.get("lane");

  return normalizeUrlState({
    rate: isRate(rate) ? rate : DEFAULT_URL_STATE.rate,
    dir: isDirection(dir) ? dir : DEFAULT_URL_STATE.dir,
    gen: isGeneration(gen) ? gen : DEFAULT_URL_STATE.gen,
    path: topic ? topic.split("/") : [],
    stepping: view === "frame",
    stepIndex: Number.isFinite(parsedStep) && parsedStep >= 0 ? parsedStep : 0,
  });
}

export function encodeUrlState(state: UrlNavigationState): string {
  const params = new URLSearchParams();
  if (state.path.length > 0) params.set("topic", state.path.join("/"));
  if (state.rate !== DEFAULT_URL_STATE.rate) params.set("rate", state.rate);
  if (state.dir !== DEFAULT_URL_STATE.dir) params.set("dir", state.dir);
  if (state.gen !== DEFAULT_URL_STATE.gen) params.set("lane", state.gen);
  if (state.stepping) params.set("view", "frame");
  if (state.stepIndex > 0 && Number.isFinite(state.stepIndex)) {
    params.set("step", String(state.stepIndex));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}
