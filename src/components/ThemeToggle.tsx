import { useEffect, useRef, useState } from "react";
import type { ThemeName } from "../types";
import { useTheme } from "../theme/ThemeContext";

const choices: { label: string; value: ThemeName }[] = [
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
  { label: "Warm", value: "warm" },
];

export default function ThemeToggle() {
  const { theme, set } = useTheme();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        menuButton.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const isLight = theme === "light";
  return (
    <div className="theme-switcher" ref={root} role="group" aria-label="Theme">
      <button
        className="icon-btn theme-switcher__toggle"
        onClick={() => { set(isLight ? "dark" : "light"); setOpen(false); }}
        aria-label={isLight ? "Switch to dark theme" : "Switch to light theme"}
        title={isLight ? "Dark theme" : "Light theme"}
      >
        {isLight ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4-1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
        )}
      </button>
      <button
        ref={menuButton}
        className="icon-btn theme-switcher__menu-button"
        aria-label="Choose theme"
        aria-expanded={open}
        aria-controls="theme-choices"
        onClick={() => setOpen((value) => !value)}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="m2.5 4.5 3.5 3 3.5-3" />
        </svg>
      </button>
      {open && <div id="theme-choices" className="theme-switcher__choices" role="group" aria-label="Theme choices">
        {choices.map(({ label, value }) => (
          <button key={value} aria-pressed={theme === value} onClick={() => { set(value); setOpen(false); menuButton.current?.focus(); }}>
            {label}
          </button>
        ))}
      </div>}
    </div>
  );
}
