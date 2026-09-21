import { describe, expect, it } from "vitest";
import { closeInspector, openInspector, stageForWalkthrough } from "../src/inspector/stageMap";
import { DEFAULT_URL_STATE, decodeUrlState, encodeUrlState } from "../src/navigation/urlState";

describe("inspector navigation", () => {
  it("preserves a frame walkthrough through an inspector URL round trip", () => {
    const before = {
      ...DEFAULT_URL_STATE,
      view: "frame" as const,
      rate: "800G" as const,
      dir: "rx" as const,
      gen: "200" as const,
      stepIndex: 3,
    };
    const opened = openInspector(before);

    expect(opened.view).toBe("inspector");
    expect(opened.inspectorStage).toBe("fec");
    expect(closeInspector(decodeUrlState(encodeUrlState(opened)))).toEqual(before);
  });

  it("keeps the legacy frame URL behavior", () => {
    expect(decodeUrlState("?view=frame&step=4").view).toBe("frame");
  });

  it("encodes inspector-only route values after the existing global parameters", () => {
    expect(encodeUrlState({
      ...DEFAULT_URL_STATE,
      rate: "800G",
      dir: "rx",
      gen: "200",
      view: "inspector",
      inspectorStage: "fec",
      inspectorReturn: "frame",
      stepIndex: 3,
    })).toBe("?rate=800G&dir=rx&lane=200&view=inspector&step=3&inspectStage=fec&from=frame");
  });

  it("normalizes malformed inspector fields and omits them outside inspector mode", () => {
    expect(decodeUrlState("?view=inspector&inspectStage=wrong&from=elsewhere")).toMatchObject({
      view: "inspector",
      inspectorStage: "mac",
      inspectorReturn: "stack",
    });
    expect(encodeUrlState({ ...DEFAULT_URL_STATE, inspectorStage: "fec", inspectorReturn: "frame" })).toBe("");
  });

  it("maps RX lessons to their matching TX inspector stage without RX computation", () => {
    expect(stageForWalkthrough("rx-fec")).toBe("fec");
    expect(stageForWalkthrough("rx-decode")).toBe("encode66");
    expect(stageForWalkthrough("not-a-stage")).toBe("mac");
  });
});
