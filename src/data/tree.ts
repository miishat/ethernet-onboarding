// Tree navigation + rate-keyed accessors, extracted from the original file.
import type { Rate, Dir, StackNode, RateMap } from "../types";
import { DATA } from "./stack";

/** Any field may be given per rate, or as `all` for a rate-independent value. */
export function pick<T>(map: RateMap<T> | undefined, rate: Rate): T | null {
  if (!map) return null;
  if (map[rate] !== undefined) return map[rate] as T;
  if (map.all !== undefined) return map.all as T;
  return null;
}

export function rawKids(node: StackNode | null): StackNode[] {
  if (!node) return [];
  return node.subs || node.sections || [];
}

export function kidsOf(node: StackNode | null, dir: Dir): StackNode[] {
  return rawKids(node).filter((s) => {
    const d = s.dir || "both";
    return d === "both" || d === dir;
  });
}

export function nodeAt(path: string[]): StackNode | null {
  if (!path.length) return null;
  let n: StackNode | undefined = DATA[path[0]];
  for (let i = 1; i < path.length && n; i++) {
    n = rawKids(n).find((s) => s.id === path[i]);
  }
  return n || null;
}

export function descendantIds(node: StackNode | null): string[] {
  const out: string[] = [];
  (function walk(n: StackNode | null) {
    rawKids(n).forEach((s) => {
      out.push(s.id);
      walk(s);
    });
  })(node);
  return out;
}

export const TRACKABLE: number = (() => {
  let n = 0;
  Object.keys(DATA).forEach((k) => {
    n += descendantIds(DATA[k]).length;
  });
  return n;
})();
