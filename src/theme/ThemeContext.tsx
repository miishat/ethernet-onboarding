import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Palette, Zone, ThemeName } from "../types";
import { PALETTES, ZONES_BY_THEME } from "./palette";

interface ThemeCtx {
  theme: ThemeName;
  toggle: () => void;
  set: (t: ThemeName) => void;
  C: Palette;
  zones: Record<string, Zone>;
}

const Ctx = createContext<ThemeCtx | null>(null);
const STORAGE_KEY = "eos-theme";

function initialTheme(): ThemeName {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* ignore */
  }
  try {
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) {
      return "light";
    }
  } catch {
    /* ignore */
  }
  return "dark";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeName>(initialTheme);

  useEffect(() => {
    try {
      document.documentElement.setAttribute("data-theme", theme);
    } catch {
      /* ignore */
    }
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const value = useMemo<ThemeCtx>(
    () => ({
      theme,
      toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
      set: setTheme,
      C: PALETTES[theme],
      zones: ZONES_BY_THEME[theme],
    }),
    [theme],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function useThemeCtx(): ThemeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

/** Current palette object (same keys as the original `C`). */
export const useC = (): Palette => useThemeCtx().C;
/** Current per-zone colours. */
export const useZones = (): Record<string, Zone> => useThemeCtx().zones;
/** Theme name plus controls. */
export const useTheme = () => {
  const { theme, toggle, set } = useThemeCtx();
  return { theme, toggle, set };
};
