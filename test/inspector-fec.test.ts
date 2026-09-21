import { describe, expect, it } from "vitest";
import { gfMultiply } from "../src/inspector/engine/gf1024";
import { encodeRs544 } from "../src/inspector/engine/rs544";
import rsVector from "./fixtures/inspector/rs544-standalone-polynomial-v1.json";

describe("GF(2^10) arithmetic", () => {
  it("uses the primitive polynomial x^10 + x^3 + 1", () => {
    expect(gfMultiply(1, 1)).toBe(1);
    expect(gfMultiply(2, 2)).toBe(4);
    expect(gfMultiply(512, 2)).toBe(9);
  });

  it.each([[-1, 1], [1024, 1], [1, -1], [1, 1024], [1.5, 2]])(
    "rejects GF values outside 0 through 1023: %p, %p",
    (left, right) => {
      expect(() => gfMultiply(left, right)).toThrow(/0.*1023/);
    },
  );
});

describe("standalone RS(544,514)", () => {
  it("matches the independently generated nonzero systematic codeword", () => {
    const codeword = encodeRs544(Uint16Array.from(rsVector.message));
    expect(Array.from(codeword)).toEqual(rsVector.codeword);
    expect(Array.from(codeword.subarray(0, 514))).toEqual(rsVector.message);
    expect(Array.from(codeword.subarray(514))).toEqual(rsVector.codeword.slice(514));
  });

  it("encodes an all-zero message as the all-zero codeword", () => {
    expect(Array.from(encodeRs544(new Uint16Array(514)))).toEqual(Array.from({ length: 544 }, () => 0));
  });

  it("rejects non-514 messages and out-of-range symbols", () => {
    expect(() => encodeRs544(new Uint16Array(513))).toThrow(/514/);
    expect(() => encodeRs544(Uint16Array.from({ length: 514 }, () => 1024))).toThrow(/0.*1023/);
  });
});
