// Small helpers for keeping SVG text inside its box.

/** Rough width of a text run, so we compress only strings that would overflow. */
export function estWidth(str: string, fontPx: number, mono: boolean): number {
  return str.length * fontPx * (mono ? 0.6 : 0.56);
}

/** SVG props that squeeze a string into `maxW` when it would otherwise spill; empty otherwise. */
export function fitProps(str: string, fontPx: number, maxW: number, mono: boolean) {
  if (maxW > 0 && estWidth(str, fontPx, mono) > maxW) {
    return { textLength: Math.max(maxW, 10), lengthAdjust: "spacingAndGlyphs" as const };
  }
  return {};
}
