import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
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

function pcsFromBitStrings(bits: readonly string[]): readonly Uint8Array[] {
  return bits.map((lane) => Uint8Array.from(lane, Number));
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

  it("preserves mux phase and per-PCSL offsets across an arbitrary output boundary", () => {
    const pcs = fixturePcs(16);
    const whole = mapPhysicalLanes(pcs, REFERENCE_PMA_MAPPING, 0, 64);
    const first = mapPhysicalLanes(pcs, REFERENCE_PMA_MAPPING, 0, 13);
    const second = mapPhysicalLanes(pcs, REFERENCE_PMA_MAPPING, first.nextState, 51);
    const secondWithDefaultLength = mapPhysicalLanes(pcs, REFERENCE_PMA_MAPPING, first.nextState);

    expect(joinLanes(first.lanes, second.lanes)).toEqual(whole.lanes);
    expect(joinLanes(first.lanes, secondWithDefaultLength.lanes)).toEqual(whole.lanes);
    expect(secondWithDefaultLength.nextAbsoluteBit).toBe(64);
    expect(second.nextAbsoluteBit).toBe(whole.nextAbsoluteBit);
    expect(first.nextState.consumedBitsByPcsLane).toEqual([
      4, 3, 3, 3, 4, 3, 3, 3, 4, 3, 3, 3, 4, 3, 3, 3,
    ]);
    expect(first.sourcePcsLaneTraceByPmdLane[0]).toEqual([0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 0]);
    expect(second.sourcePcsLaneTraceByPmdLane[0].slice(0, 4)).toEqual([1, 2, 3, 0]);
  });

  it("rejects incomplete schedules, nonbinary values, and unequal PCS lane lengths", () => {
    const pcs = fixturePcs(2);
    expect(() => mapPhysicalLanes(pcs.slice(0, 15), REFERENCE_PMA_MAPPING, 0)).toThrow(/16 PCS/);
    expect(() => mapPhysicalLanes([...pcs.slice(0, 15), Uint8Array.of(0)], REFERENCE_PMA_MAPPING, 0)).toThrow(/equal length/);
    expect(() => mapPhysicalLanes([...pcs.slice(0, 15), Uint8Array.of(2, 0)], REFERENCE_PMA_MAPPING, 0)).toThrow(/binary/);
    expect(() => mapPhysicalLanes(pcs, { ...REFERENCE_PMA_MAPPING, periodBits: 3 } as never, 0)).toThrow(/period/);
    expect(() => mapPhysicalLanes(pcs, REFERENCE_PMA_MAPPING, {
      absoluteOutputBit: 0,
      consumedBitsByPcsLane: [0],
    }, 1)).toThrow(/16/);
    expect(() => mapPhysicalLanes(pcs, REFERENCE_PMA_MAPPING, 0, 9)).toThrow(/available/);
  });

  it("rejects a longer PMA period that repeats a PCS lane instead of covering every lane once", () => {
    const repeated = {
      ...REFERENCE_PMA_MAPPING,
      periodBits: 8,
      sourcePcsLaneByPmdLane: [
        [0, 1, 2, 3, 0, 1, 2, 3],
        [4, 5, 6, 7, 4, 5, 6, 7],
        [8, 9, 10, 11, 8, 9, 10, 11],
        [12, 13, 14, 15, 12, 13, 14, 15],
      ],
    } as never;

    expect(() => mapPhysicalLanes(fixturePcs(2), repeated, 0)).toThrow(/exactly once per cycle/);
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
      startState: referenceFixture.startState,
      nextState: referenceFixture.nextState,
      pmdLaneBits: referenceFixture.pmdLaneBits,
      pam4: referenceFixture.pam4,
    });
    const referencePath = fileURLToPath(new URL("../scripts/inspector-reference.py", import.meta.url));

    expect(referenceFixture.status).toBe("independently-reviewed-experimental-only");
    expect(referenceFixture.review).toMatchObject({
      reviewerId: "/root/phy_pma_review_light",
      reviewedOn: "2026-09-24",
      result: "accepted-experimental-only",
    });
    expect(sha256(new TextEncoder().encode(canonical))).toBe(referenceFixture.artifactSha256);
    expect(sha256(readFileSync(referencePath))).toBe("ed909a8d07e15fadcaa85004120827c3e532f2328f8f8bc82cbbb2ee0f2370de");
    const independent = spawnSync("python", [referencePath, "--pma-json"], { encoding: "utf8" });
    expect(independent.status, independent.stderr).toBe(0);
    expect(JSON.parse(independent.stdout).artifactSha256).toBe(referenceFixture.artifactSha256);
    expect(referenceFixture.pmdLaneBits.every((bits) => bits.length === 64)).toBe(true);

    const physical = mapPhysicalLanes(
      pcsFromBitStrings(referenceFixture.inputPcsBits),
      REFERENCE_PMA_MAPPING,
      referenceFixture.startAbsoluteBit,
      64,
    );
    expect(physical.startAbsoluteBit).toBe(referenceFixture.startAbsoluteBit);
    expect(physical.nextAbsoluteBit).toBe(referenceFixture.nextAbsoluteBit);
    expect(physical.nextState).toEqual(referenceFixture.nextState);
    expect(physical.lanes.map((lane) => Array.from(lane).join(""))).toEqual(referenceFixture.pmdLaneBits);
    expect(physical.sourcePcsLaneTraceByPmdLane).toEqual([
      Array.from({ length: 64 }, (_, index) => index % 4),
      Array.from({ length: 64 }, (_, index) => 4 + index % 4),
      Array.from({ length: 64 }, (_, index) => 8 + index % 4),
      Array.from({ length: 64 }, (_, index) => 12 + index % 4),
    ]);
    expect(physical.lanes.map((lane) => mapPam4(lane, REFERENCE_PMA_MAPPING))).toEqual(
      referenceFixture.pam4.map((expected) => ({
        labels: expected.dibits,
        normalizedLevels: Int8Array.from(expected.normalizedLevels),
        unit: "normalized-level",
      })),
    );
  });
});
