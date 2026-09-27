// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import ThemeToggle from "../src/components/ThemeToggle";
import { ThemeProvider } from "../src/theme/ThemeContext";

afterEach(() => {
  cleanup();
  localStorage.removeItem("eos-theme");
  document.documentElement.removeAttribute("data-theme");
});

describe("theme selection", () => {
  it("switches between light and dark with one click", async () => {
    localStorage.setItem("eos-theme", "dark");
    const user = userEvent.setup();
    render(<ThemeProvider><ThemeToggle /></ThemeProvider>);

    await user.click(screen.getByRole("button", { name: "Switch to light theme" }));
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem("eos-theme")).toBe("light");

    await user.click(screen.getByRole("button", { name: "Switch to dark theme" }));
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("offers all three themes in a compact menu and saves Warm", async () => {
    localStorage.setItem("eos-theme", "dark");
    const user = userEvent.setup();
    render(<ThemeProvider><ThemeToggle /></ThemeProvider>);

    await user.click(screen.getByRole("button", { name: "Choose theme" }));
    const options = within(screen.getByRole("group", { name: "Theme choices" }));
    expect(options.getAllByRole("button")).toHaveLength(3);
    await user.click(options.getByRole("button", { name: "Warm Dark" }));
    expect(document.documentElement.getAttribute("data-theme")).toBe("warm");
    expect(localStorage.getItem("eos-theme")).toBe("warm");
    expect(screen.queryByRole("group", { name: "Theme choices" })).toBeNull();
  });

  it("restores the saved warm theme", () => {
    localStorage.setItem("eos-theme", "warm");
    render(<ThemeProvider><ThemeToggle /></ThemeProvider>);

    expect(document.documentElement.getAttribute("data-theme")).toBe("warm");
    expect(screen.getByRole("button", { name: "Switch to light theme" })).toBeTruthy();
  });
});
