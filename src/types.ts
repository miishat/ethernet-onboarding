// Shared domain types for the Ethernet Onboarding instrument.

export type Rate = "400G" | "800G" | "1.6T";
export type Dir = "tx" | "rx" | "both";
export type ThemeName = "dark" | "light";

/** A value that may be given per rate, or as `all` for a rate-independent value. */
export type RateMap<T> = Partial<Record<Rate, T>> & { all?: T };

/** Source/confidence flag attached to a parameter row. */
export interface Flag {
  draft?: boolean;
  industry?: boolean;
  inferred?: boolean;
}

/** A parameter row: [label, value] with an optional trailing flag object. */
export type ParamRow = Array<string | Flag>;

export interface QuizItem {
  q: string;
  opts: string[];
  a: number;
  why: string;
}

export interface StackNode {
  id: string;
  name: string;
  alias?: string;
  zone?: string;
  group?: string;
  written?: boolean;
  dir?: Dir;
  clause?: RateMap<string>;
  face?: RateMap<string>;
  summary?: string;
  intro?: string;
  body?: string;
  terms?: Record<string, string>;
  params?: RateMap<ParamRow[]>;
  quiz?: QuizItem[];
  subs?: StackNode[];
  sections?: StackNode[];
}

export interface Stage {
  id: string;
  block: string;
  title: string;
  shape: string;
  note: string;
  count: (r: Rate) => string;
}

export interface LaneInfo {
  pcs: number | null;
  phys: number;
  laneRate: string;
  baud: string;
}

/** Diagram specs are intentionally polymorphic; the Diagram renderer discriminates on `type`. */
export interface DiagramSpec {
  type: string;
  [k: string]: unknown;
}

export interface Zone {
  label: string;
  hue: string;
  fill: string;
  note: string;
}

export interface Palette {
  ink: string;
  ink2: string;
  ink3: string;
  rule: string;
  ruleSoft: string;
  text: string;
  dim: string;
  faint: string;
  signal: string;
  signalDim: string;
  signalWash: string;
  good: string;
  bad: string;
  /** secondary neutral field (distinct from ink3) used in some diagrams */
  altFill: string;
  altStroke: string;
  /** faint background behind a damaged/error element */
  badWash: string;
  maxW: number;
  mono: string;
  sans: string;
}
