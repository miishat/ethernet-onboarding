import { describe, expect, it } from "vitest";
import {
  DEFAULT_URL_STATE,
  decodeUrlState,
  encodeUrlState,
} from "../src/navigation/urlState";

describe("URL navigation state", () => {
  it("encodes defaults as an empty query and decodes them", () => {
    expect(encodeUrlState(DEFAULT_URL_STATE)).toBe("");
    expect(decodeUrlState("")).toEqual(DEFAULT_URL_STATE);
  });

  it("encodes topic navigation values in the stable parameter order", () => {
    const state = {
      ...DEFAULT_URL_STATE,
      rate: "800G" as const,
      dir: "tx" as const,
      gen: "200" as const,
      path: ["pcs", "pcs-am"],
    };
    const encoded = "?topic=pcs%2Fpcs-am&rate=800G&lane=200";

    expect(encodeUrlState(state)).toBe(encoded);
    expect(decodeUrlState(encoded)).toEqual(state);
  });

  it("encodes walkthrough view and positive step", () => {
    const state = {
      ...DEFAULT_URL_STATE,
      rate: "1.6T" as const,
      stepping: true,
      stepIndex: 4,
    };

    expect(encodeUrlState(state)).toBe("?rate=1.6T&view=frame&step=4");
  });

  it("falls back to defaults for invalid values", () => {
    expect(decodeUrlState("?rate=fast&dir=sideways&lane=50&view=nope&step=-8")).toEqual(
      DEFAULT_URL_STATE,
    );
  });
});
