import { describe, expect, it } from "vitest";
import { scrambleBits } from "../src/inspector/engine/scramble";
import { insertMarkers, planMarkers } from "../src/inspector/engine/markers";
import { prepareStream } from "../src/inspector/engine/stream";
import type { RateMatchPolicy } from "../src/inspector/types";
import type { Block257 } from "../src/inspector/engine/transcode257";
import scrambleFixture from "./fixtures/inspector/scramble-reference-policy-v1.json";

const policy: RateMatchPolicy = {
  id: "product-owned-reference-am-rate-match-v1", source: "project-owned",
  eligibleIdleControlCodes: [0x07], selection: "earliest-eligible-before-reservation",
  tieBreak: "lowest-absolute-word-index", maximumDeferralBlocks: 4,
  frameBoundaryRule: "never-remove-frame-data",
  amSchedule: { unit: "transcoded-257b-block", cadenceBlocks: 40, reservationBlocks: 2, fecPairBlocks: 2, phaseZeroAbsoluteStreamBlock: 0 },
};
const blocks = (count: number): Block257[] => Array.from({ length: count }, (_, index) => ({
  index, bits: Uint8Array.from({ length: 257 }, (_, bit) => (index + bit) & 1), sourceBlockIds: [index * 4, index * 4 + 1, index * 4 + 2, index * 4 + 3],
  provenance: { profileId: "400gbase-dr4-tx-reference-pma-v1", status: "experimental-candidate", sourceId: "ieee-bs-d14-cl119-locator", controlPolicyId: "product-owned-cdmii-controls-v1", label: "Experimental reference using candidate contracts", candidateArtifactSha256: "64f58abe7bc197578eebd0a0dc8d4b0d97e4855173b61bce6955e97b5accc1f9", candidatePages: [98, 99, 100, 101] },
}));

describe("experimental reference scrambling and alignment markers", () => {
  it("carries the predecessor state across a split window", () => {
    const input = Uint8Array.from({ length: 512 }, (_, index) => (index * 7 + 3) & 1);
    const initial = Uint8Array.from({ length: 58 }, (_, index) => index % 3 === 0 ? 1 : 0);
    const whole = scrambleBits(input, initial);
    const first = scrambleBits(input.slice(0, 313), initial);
    const second = scrambleBits(input.slice(313), first.state);
    expect(Uint8Array.from([...first.bits, ...second.bits])).toEqual(whole.bits);
    expect(second.state).toEqual(whole.state);
    expect(Array.from(whole.bits).join("")).toBe(scrambleFixture.first512OutputBits);
    expect(whole.bits.slice(0, 16)).toEqual(Uint8Array.of(0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1));
  });

  it("schedules ceiling-cadence reservations on FEC-pair boundaries and inserts uns scrambled marker bits", () => {
    const plan = planMarkers(blocks(41), policy, { absoluteStreamBlock: 0 });
    expect(plan.ok).toBe(true);
    if (!plan.ok) throw new Error(plan.errors.run);
    expect(plan.value.reservations).toEqual([{ groupIndex: 0, inputBlockIndex: 0, insertionBitOffset: 0, reservationBlocks: 2, fecPairIndex: 0 }, { groupIndex: 1, inputBlockIndex: 40, insertionBitOffset: 10280, reservationBlocks: 2, fecPairIndex: 20 }]);
    const source = Uint8Array.from({ length: 41 * 257 }, (_, index) => index & 1);
    const result = insertMarkers(source, plan.value, Uint8Array.from({ length: 9 }, () => 1));
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.errors.run);
    expect(result.value.bits).toHaveLength(source.length + 2 * 2 * 257);
    expect(result.value.bits.slice(514, 530)).toEqual(source.slice(0, 16));
    expect(result.value.provenance.policyId).toBe("product-owned-reference-am-values-v1");
    expect(result.value.state).toHaveLength(9);
  });

  it("deletes the earliest whole Idle words with an immutable provenance ledger", () => {
    const provenance = blocks(1)[0].provenance;
    const input = { provenance, words: [
      { index: 0, octets: Uint8Array.from({ length: 8 }, () => 0x07), controlMask: 0xff, provenance },
      { index: 1, octets: Uint8Array.from({ length: 8 }, () => 0x07), controlMask: 0xff, provenance },
      { index: 2, octets: Uint8Array.of(0xfb, 1, 2, 3, 4, 5, 6, 7), controlMask: 1, provenance },
    ] };
    const prepared = prepareStream(input, policy, 0);
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) throw new Error(prepared.errors.run);
    expect(prepared.value.stream.words).toHaveLength(1);
    expect(prepared.value.deletions.map((deletion) => deletion.originalWordIndex)).toEqual([0, 1]);
    expect(Object.isFrozen(prepared.value.deletions)).toBe(true);
    expect(prepared.value.deletions[0]).toMatchObject({ policyId: policy.id, reason: "alignment-marker-reservation", reservation: { groupIndex: 0, fecPairIndex: 0, boundaryKind: "am-group" } });
  });

  it("refuses an unaligned marker reservation or a policy that would delete frame data", () => {
    const bad = { ...policy, amSchedule: { ...policy.amSchedule, reservationBlocks: 1 } };
    expect(planMarkers(blocks(1), bad, { absoluteStreamBlock: 0 })).toMatchObject({ ok: false });
    const provenance = blocks(1)[0].provenance;
    expect(prepareStream({ provenance, words: [{ index: 0, octets: Uint8Array.of(0xfb, 1, 2, 3, 4, 5, 6, 7), controlMask: 1, provenance }] }, policy, 0)).toMatchObject({ ok: false, errors: { run: expect.stringMatching(/eligible Idle/i) } });
  });
});
