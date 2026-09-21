import { describe, expect, it } from "vitest";
import { documentTitle } from "../src/navigation/documentTitle";
import { DEFAULT_URL_STATE } from "../src/navigation/urlState";

describe("document title", () => {
  it("uses the product name at the root", () => {
    expect(documentTitle(DEFAULT_URL_STATE)).toBe("Ethernet PHY Onboarding");
  });

  it("includes the selected article name", () => {
    expect(documentTitle({ ...DEFAULT_URL_STATE, path: ["pcs", "pcs-am"] }))
      .toContain("Alignment markers");
  });

  it("includes the active walkthrough frame number", () => {
    expect(documentTitle({ ...DEFAULT_URL_STATE, view: "frame", stepIndex: 2 }))
      .toContain("Frame 3");
  });

  it("identifies the selected inspector stage", () => {
    expect(documentTitle({ ...DEFAULT_URL_STATE, view: "inspector", inspectorStage: "fec" }))
      .toContain("Frame inspector: FEC");
  });

  it("falls back to the product name for an invalid path", () => {
    expect(documentTitle({ ...DEFAULT_URL_STATE, path: ["missing-topic"] }))
      .toBe("Ethernet PHY Onboarding");
  });
});
