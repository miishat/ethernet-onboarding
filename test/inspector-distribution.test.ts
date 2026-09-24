import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  distributePcsLanes,
  encodeClause119Codeword,
  interleaveClause119,
  splitFecMessages,
} from "../src/inspector/engine/distribute";
import referenceFixture from "./fixtures/inspector/experimental-cl119-local-400g-idle-am-v1.json";

function bitsFromString(bits: string): Uint8Array {
  return Uint8Array.from(bits, (bit) => Number(bit));
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

describe("Clause 119 pre-FEC distribution", () => {
  it("packs the first 10-bit A and B symbols in first-encoder-input order", () => {
    const bits = new Uint8Array(10280);
    for (let bit = 0; bit < bits.length; bit += 1) bits[bit] = (bit >>> 1) & 1;

    const { messageA, messageB } = splitFecMessages(bits);

    expect(messageA).toHaveLength(514);
    expect(messageB).toHaveLength(514);
    expect(messageA[0]).toBe(204);
    expect(messageB[0]).toBe(819);
    expect(messageA[513]).toBe(204);
    expect(messageB[513]).toBe(819);
  });

  it("rejects an incomplete or overlong FEC pair", () => {
    expect(() => splitFecMessages(new Uint8Array(10279))).toThrow(/10280/);
    expect(() => splitFecMessages(new Uint8Array(10281))).toThrow(/10280/);
  });

  it("rejects nonbinary FEC-pair input", () => {
    const bits = new Uint8Array(10280);
    bits[257] = 2;
    expect(() => splitFecMessages(bits)).toThrow(/binary/);
  });

  it("uses the first message symbol as the first RS encoder input", () => {
    const message = Uint16Array.from({ length: 514 }, (_, index) => (index * 31 + 7) % 1024);
    const codeword = encodeClause119Codeword(message);

    expect(Array.from(codeword.subarray(0, 514))).toEqual(Array.from(message));
    expect(codeword).toHaveLength(544);
  });

  it("alternates codeword ownership on each 16-lane group", () => {
    const codewordA = Uint16Array.from({ length: 544 }, (_, index) => 1000 - index);
    const codewordB = Uint16Array.from({ length: 544 }, (_, index) => index);

    const interleaved = interleaveClause119(codewordA, codewordB);

    expect(Array.from(interleaved.subarray(0, 16))).toEqual([
      1000, 0, 999, 1, 998, 2, 997, 3,
      996, 4, 995, 5, 994, 6, 993, 7,
    ]);
    expect(Array.from(interleaved.subarray(16, 32))).toEqual([
      8, 992, 9, 991, 10, 990, 11, 989,
      12, 988, 13, 987, 14, 986, 15, 985,
    ]);
  });

  it("puts checkerboard symbols into 16 68-symbol PCS lanes", () => {
    const codewordA = Uint16Array.from({ length: 544 }, (_, index) => 1000 - index);
    const codewordB = Uint16Array.from({ length: 544 }, (_, index) => index);
    const lanes = distributePcsLanes(interleaveClause119(codewordA, codewordB));

    expect(lanes).toHaveLength(16);
    expect(Array.from(lanes[0].subarray(0, 4))).toEqual([1000, 8, 984, 24]);
    expect(Array.from(lanes[1].subarray(0, 4))).toEqual([0, 992, 16, 976]);
    expect(lanes.every((lane) => lane.length === 68)).toBe(true);
  });

  it("rejects malformed codewords and interleaved streams", () => {
    expect(() => interleaveClause119(new Uint16Array(543), new Uint16Array(544))).toThrow(/544/);
    expect(() => interleaveClause119(Uint16Array.from({ length: 544 }, () => 1024), new Uint16Array(544))).toThrow(/0.*1023/);
    expect(() => distributePcsLanes(new Uint16Array(1087))).toThrow(/1088/);
  });

  it("matches the independently generated nonzero 400G AM FEC fixture", () => {
    const sourceBits = bitsFromString(referenceFixture.txScrambledAmBits);
    const { messageA, messageB } = splitFecMessages(sourceBits);
    const codewordA = encodeClause119Codeword(messageA);
    const codewordB = encodeClause119Codeword(messageB);
    const interleaved = interleaveClause119(codewordA, codewordB);
    const lanes = distributePcsLanes(interleaved);
    const canonical = JSON.stringify({
      txScrambledAmBits: referenceFixture.txScrambledAmBits,
      messageA: referenceFixture.messageA,
      messageB: referenceFixture.messageB,
      codewordA: referenceFixture.codewordA,
      codewordB: referenceFixture.codewordB,
      interleaved: referenceFixture.interleaved,
      lanes: referenceFixture.lanes,
    });
    const referencePath = fileURLToPath(new URL("../scripts/inspector-reference.py", import.meta.url));

    expect(sha256(new TextEncoder().encode(canonical))).toBe(referenceFixture.artifactSha256);
    expect(sha256(readFileSync(referencePath))).toBe(referenceFixture.reference.sha256);
    expect(referenceFixture.review).toMatchObject({
      reviewerId: "/root/phy_distribution_review_light",
      reviewedOn: "2026-09-24",
      result: "accepted-experimental-only",
    });
    expect(Array.from(messageA)).toEqual(referenceFixture.messageA);
    expect(Array.from(messageB)).toEqual(referenceFixture.messageB);
    expect(Array.from(codewordA)).toEqual(referenceFixture.codewordA);
    expect(Array.from(codewordB)).toEqual(referenceFixture.codewordB);
    expect(Array.from(interleaved)).toEqual(referenceFixture.interleaved);
    expect(lanes.map((lane) => Array.from(lane))).toEqual(referenceFixture.lanes);
  });
});
