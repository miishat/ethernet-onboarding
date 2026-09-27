import type { Palette, Zone, ThemeName } from "../types";

const MONO =
  '"JetBrains Mono", ui-monospace, "SF Mono", SFMono-Regular, "Cascadia Code", Menlo, Consolas, monospace';
const SANS =
  'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

/* ===========================================================================
   PALETTE - three themes with identical keys, so every SVG that reads a palette value
   simply recolours when the theme changes.
   =========================================================================== */
export const DARK: Palette = {
  ink: "#0c141f",
  ink2: "#111c28",
  ink3: "#18242f",
  rule: "#25384b",
  ruleSoft: "#1c2b3a",
  text: "#dae4ed",
  dim: "#8fa1b3",
  faint: "#607586",
  signal: "#f2b03d",
  signalDim: "#7d5c1f",
  signalWash: "#251d0e",
  diagram: "#78a9d5",
  diagramDim: "#426b92",
  diagramWash: "#172a3d",
  good: "#5fae8c",
  bad: "#c9756b",
  altFill: "#1c2536",
  altStroke: "#42586d",
  badWash: "#2b1a18",
  maxW: 700,
  mono: MONO,
  sans: SANS,
};

export const WARM: Palette = {
  ink: "#191815",
  ink2: "#24211e",
  ink3: "#302c27",
  rule: "#524a40",
  ruleSoft: "#3b362f",
  text: "#eee9df",
  dim: "#c2b8aa",
  faint: "#a79c8d",
  signal: "#e8ad76",
  signalDim: "#9b6e49",
  signalWash: "#463020",
  diagram: "#acc8ab",
  diagramDim: "#718f72",
  diagramWash: "#263b30",
  good: "#8fc69f",
  bad: "#e18c82",
  altFill: "#302d30",
  altStroke: "#796c67",
  badWash: "#452b2a",
  maxW: 700,
  mono: MONO,
  sans: SANS,
};

export const LIGHT: Palette = {
  ink: "#ece9e1", // warm paper ground
  ink2: "#f5f2ea", // raised panel
  ink3: "#ffffff", // crisp block face
  rule: "#c6c0b1",
  ruleSoft: "#e2ddd0",
  text: "#182430", // ink navy
  dim: "#4b5966",
  faint: "#66727f", // darkened so small mono labels stay legible on paper
  signal: "#b06f00", // deep amber - reads as text on paper, same accent family
  signalDim: "#d6a24e",
  signalWash: "#fbf0d6",
  diagram: "#2c709e",
  diagramDim: "#75a2bf",
  diagramWash: "#e5f0f7",
  good: "#2f8f6b",
  bad: "#c0503f",
  altFill: "#e7ecf2",
  altStroke: "#9fb0c0",
  badWash: "#f7e2dd",
  maxW: 700,
  mono: MONO,
  sans: SANS,
};

/* zone = which band of the stack a block belongs to.
   label/note are theme-independent; hue/fill are tuned per ground. */
export const ZONES_DARK: Record<string, Zone> = {
  framing: { label: "frames", hue: "#2b4557", fill: "#16242f", note: "rate-agnostic" },
  coding: { label: "coding and correction", hue: "#3c3f63", fill: "#1a1c2b", note: "where the rate shows up" },
  signal: { label: "signal and medium", hue: "#2a5045", fill: "#14231f", note: "where reach is decided" },
};

export const ZONES_WARM: Record<string, Zone> = {
  framing: { label: "frames", hue: "#647b7b", fill: "#2b3233", note: "rate-agnostic" },
  coding: { label: "coding and correction", hue: "#887487", fill: "#37303b", note: "where the rate shows up" },
  signal: { label: "signal and medium", hue: "#738f70", fill: "#2b382f", note: "where reach is decided" },
};

export const ZONES_LIGHT: Record<string, Zone> = {
  framing: { label: "frames", hue: "#5a7f97", fill: "#e9f0f4", note: "rate-agnostic" },
  coding: { label: "coding and correction", hue: "#6b6e9a", fill: "#eeecf6", note: "where the rate shows up" },
  signal: { label: "signal and medium", hue: "#4f8a76", fill: "#e6f1ec", note: "where reach is decided" },
};

export const PALETTES: Record<ThemeName, Palette> = { dark: DARK, light: LIGHT, warm: WARM };
export const ZONES_BY_THEME: Record<ThemeName, Record<string, Zone>> = {
  dark: ZONES_DARK,
  light: ZONES_LIGHT,
  warm: ZONES_WARM,
};
