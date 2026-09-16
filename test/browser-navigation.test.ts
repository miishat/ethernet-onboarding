import { describe, expect, it } from "vitest";
import { buildNavigationHref } from "../src/navigation/useUrlNavigation";
import { DEFAULT_URL_STATE } from "../src/navigation/urlState";

describe("browser navigation href", () => {
  it("preserves the GitHub Pages base path", () => {
    expect(
      buildNavigationHref(
        { ...DEFAULT_URL_STATE, path: ["pcs"] },
        "/ethernet-onboarding/",
        "",
      ),
    ).toBe("/ethernet-onboarding/?topic=pcs");
  });

  it("drops stale hashes while retaining the current path", () => {
    expect(buildNavigationHref(DEFAULT_URL_STATE, "/ethernet-onboarding/", "#old")).toBe(
      "/ethernet-onboarding/",
    );
  });
});
