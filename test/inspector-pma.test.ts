import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { REFERENCE_PMA_MAPPING } from "../src/inspector/defaults";
import { mapPam4 } from "../src/inspector/engine/pam4";
import { mapPhysicalLanes } from "../src/inspector/engine/pma";
import referenceFixture from "./fixtures/inspector/reference-pma-16x4-v1.json";

function fixturePcs(length: number): readonly Uint8Array[] {
  return Array.from({ length: 16 }, (_, lane) => Uint8Array.from(
    { length },
    (_, bit) => ((lane * 11 + bit * 7 + 3) >>> (bit % 4)) & 1,
  ));
}

function joinLanes(first: readonly Uint8Array[], second: readonly Uint8Array[]): readonly Uint8Array[] {
  return first.map((lane, index) => Uint8Array.from([...lane, ...second[index]]));
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

describe("reference 16-to-4 PMA mapping", () => {
  it("maps each PMD lane through its declared four-PCSL schedule", () => {
    const pcs = Array.from({ length: 16 }, (_, lane) => Uint8Array.from([
      lane & 1,
      (lane >>> 1) & 1,
      (lane >>> 2) & 1,
      (lane >>> 3) & 1,
    ]));

    const result = mapPhysicalLanes(pcs, REFERENCE_PMA_MAPPING, 0);

    expect(Array.from(result.lanes[0])).toEqual([
      0, 1, 0, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0,
    ]);
    expect(Array.from(result.lanes[3].subarray(0, 4))).toEqual([0, 1, 0, 1]);
    expect(result).toMatchObject({ startAbsoluteBit: 0, nextAbsoluteBit: 16 });
  });

  it("preserves mux phase across equal PCS windows", () => {
    const pcs = fixturePcs(16);
    const whole = mapPhysicalLanes(pcs, REFERENCE_PMA_MAPPING, 0);
    const firstPcs = pcs.map((lane) => lane.slice(0, 13));
    const secondPcs = pcs.map((lane) => lane.slice(13));
    const first = mapPhysicalLanes(firstPcs, REFERENCE_PMA_MAPPING, 0);
    const second = mapPhysicalLanes(secondPcs, REFERENCE_PMA_MAPPING, first.nextAbsoluteBit);

    expect(joinLanes(first.lanes, second.lanes)).toEqual(whole.lanes);
    expect(second.nextAbsoluteBit).toBe(whole.nextAbsoluteBit);
  });

  it("rejects incomplete schedules, nonbinary values, and unequal PCS lane lengths", () => {
    const pcs = fixturePcs(2);
    expect(() => mapPhysicalLanes(pcs.slice(0, 15), REFERENCE_PMA_MAPPING, 0)).toThrow(/16 PCS/);
    expect(() => mapPhysicalLanes([...pcs.slice(0, 15), Uint8Array.of(0)], REFERENCE_PMA_MAPPING, 0)).toThrow(/equal length/);
    expect(() => mapPhysicalLanes([...pcs.slice(0, 15), Uint8Array.of(2, 0)], REFERENCE_PMA_MAPPING, 0)).toThrow(/binary/);
    expect(() => mapPhysicalLanes(pcs, { ...REFERENCE_PMA_MAPPING, periodBits: 3 } as never, 0)).toThrow(/period/);
  });

  it("maps MSB-first dibits to the declared normalized Gray levels", () => {
    const result = mapPam4(Uint8Array.of(0, 0, 0, 1, 1, 1, 1, 0), REFERENCE_PMA_MAPPING);

    expect(result.labels).toEqual(["00", "01", "11", "10"]);
    expect(Array.from(result.normalizedLevels)).toEqual([-3, -1, 1, 3]);
    expect(result.unit).toBe("normalized-level");
  });

  it("rejects odd, nonbinary, or unsupported-precoder PAM4 input", () => {
    expect(() => mapPam4(Uint8Array.of(0), REFERENCE_PMA_MAPPING)).toThrow(/even/);
    expect(() => mapPam4(Uint8Array.of(0, 2), REFERENCE_PMA_MAPPING)).toThrow(/binary/);
    expect(() => mapPam4(Uint8Array.of(0, 0), {
      ...REFERENCE_PMA_MAPPING,
      precoder: { mode: "present" },
    } as never)).toThrow(/precoder/);
  });

  it("records the independently generated PMA fixture as pending review", () => {
    const canonical = JSON.stringify({
      inputPcsBits: referenceFixture.inputPcsBits,
      startAbsoluteBit: referenceFixture.startAbsoluteBit,
      nextAbsoluteBit: referenceFixture.nextAbsoluteBit,
      pmdLaneBits: referenceFixture.pmdLaneBits,
      pam4: referenceFixture.pam4,
    });
    const referencePath = fileURLToPath(new URL("../scripts/inspector-reference.py", import.meta.url));

    expect(referenceFixture.status).toBe("pending-independent-review");
    expect(referenceFixture.review.result).toBe("pending");
    expect(sha256(new TextEncoder().encode(canonical))).toBe(referenceFixture.artifactSha256);
    expect(sha256(readFileSync(referencePath))).toBe(referenceFixture.reference.sha256);
    expect(referenceFixture.pmdLaneBits.every((bits) => bits.length === 64)).toBe(true);
  });
});
