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
  it("offers light, original dark, and warm themes and saves the choice", async () => {
    localStorage.setItem("eos-theme", "dark");
    const user = userEvent.setup();
    render(<ThemeProvider><ThemeToggle /></ThemeProvider>);

    const options = within(screen.getByRole("group", { name: "Theme" }));
    expect(options.getAllByRole("button")).toHaveLength(3);
    expect(options.getByRole("button", { name: "Dark" }).getAttribute("aria-pressed")).toBe("true");

    await user.click(options.getByRole("button", { name: "Warm" }));
    expect(document.documentElement.getAttribute("data-theme")).toBe("warm");
    expect(localStorage.getItem("eos-theme")).toBe("warm");
    expect(options.getByRole("button", { name: "Warm" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("restores the saved warm theme", () => {
    localStorage.setItem("eos-theme", "warm");
    render(<ThemeProvider><ThemeToggle /></ThemeProvider>);

    expect(document.documentElement.getAttribute("data-theme")).toBe("warm");
    expect(screen.getByRole("button", { name: "Warm" }).getAttribute("aria-pressed")).toBe("true");
  });
});
