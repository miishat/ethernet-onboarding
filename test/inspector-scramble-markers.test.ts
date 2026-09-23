import { describe, expect, it } from "vitest";
import { scrambleBits } from "../src/inspector/engine/scramble";
import { insertMarkers, planMarkers } from "../src/inspector/engine/markers";
import { prepareStream } from "../src/inspector/engine/stream";
import type { RateMatchPolicy } from "../src/inspector/types";
import type { Block257 } from "../src/inspector/engine/transcode257";
import scrambleFixture from "./fixtures/inspector/scramble-reference-policy-v1.json";
import markerFixture from "./fixtures/inspector/marker-reference-policy-v1.json";

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
    expect(Object.isFrozen(plan.value.deletions)).toBe(true);
    const source = Uint8Array.from({ length: 41 * 257 }, (_, index) => index & 1);
    const result = insertMarkers(source, plan.value, Uint8Array.from({ length: 9 }, () => 1));
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.errors.run);
    expect(result.value.bits).toHaveLength(source.length + 2 * 2 * 257);
    expect(Array.from(result.value.bits.slice(0, 514)).join("")).toBe(markerFixture.firstMarkerBits);
    expect(Array.from(result.value.bits.slice(514, 530))).toEqual(Array.from(source.slice(0, 16)));
    expect(result.value.provenance.policyId).toBe("product-owned-reference-am-values-v1");
    expect(Array.from(result.value.state).join("")).toBe(markerFixture.carriedPrbsStateAfterTwoMarkers);
    expect(result.value.deletions).toEqual([]);
  });

  it("deletes the earliest whole Idle words with an immutable provenance ledger", () => {
    const provenance = blocks(1)[0].provenance;
    const input = { provenance, words: [
      { index: 0, octets: Uint8Array.from({ length: 8 }, () => 0x07), controlMask: 0xff, provenance },
      { index: 1, octets: Uint8Array.from({ length: 8 }, () => 0x07), controlMask: 0xff, provenance },
      { index: 2, octets: Uint8Array.from({ length: 8 }, () => 0x07), controlMask: 0xff, provenance },
      { index: 3, octets: Uint8Array.from({ length: 8 }, () => 0x07), controlMask: 0xff, provenance },
      { index: 4, octets: Uint8Array.from({ length: 8 }, () => 0x07), controlMask: 0xff, provenance },
      { index: 5, octets: Uint8Array.from({ length: 8 }, () => 0x07), controlMask: 0xff, provenance },
      { index: 6, octets: Uint8Array.from({ length: 8 }, () => 0x07), controlMask: 0xff, provenance },
      { index: 7, octets: Uint8Array.from({ length: 8 }, () => 0x07), controlMask: 0xff, provenance },
      { index: 8, octets: Uint8Array.of(0xfb, 1, 2, 3, 4, 5, 6, 7), controlMask: 1, provenance },
    ] };
    const prepared = prepareStream(input, policy, 0);
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) throw new Error(prepared.errors.run);
    expect(prepared.value.stream.words).toHaveLength(1);
    expect(prepared.value.deletions.map((deletion) => deletion.originalWordIndex)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(Object.isFrozen(prepared.value.deletions)).toBe(true);
    expect(prepared.value.deletions[0]).toMatchObject({ policyId: policy.id, reason: "alignment-marker-reservation", reservation: { groupIndex: 0, insertionBitOffset: 0, fecPairIndex: 0, boundaryKind: "am-group" } });
    const plan = planMarkers(blocks(1), policy, { absoluteStreamBlock: 0 }, prepared.value.deletions);
    if (!plan.ok) throw new Error(plan.errors.run);
    expect(plan.value.deletions).toEqual(prepared.value.deletions);
    expect(Object.isFrozen(plan.value.deletions[0])).toBe(true);
    const result = insertMarkers(Uint8Array.from({ length: 257 }, () => 0), plan.value, Uint8Array.from({ length: 9 }, () => 1));
    if (!result.ok) throw new Error(result.errors.run);
    expect(result.value.deletions).toBe(plan.value.deletions);
  });

  it("refuses an unaligned marker reservation or a policy that would delete frame data", () => {
    const bad = { ...policy, amSchedule: { ...policy.amSchedule, reservationBlocks: 1 } };
    expect(planMarkers(blocks(1), bad, { absoluteStreamBlock: 0 })).toMatchObject({ ok: false });
    const provenance = blocks(1)[0].provenance;
    expect(prepareStream({ provenance, words: [{ index: 0, octets: Uint8Array.of(0xfb, 1, 2, 3, 4, 5, 6, 7), controlMask: 1, provenance }] }, policy, 0)).toMatchObject({ ok: false, errors: { run: expect.stringMatching(/eligible Idle/i) } });
  });

  it("does not defer a reservation past the declared maximum", () => {
    const provenance = blocks(1)[0].provenance;
    const lateIdles = Array.from({ length: 8 }, (_, offset) => ({ index: offset + 5, octets: Uint8Array.from({ length: 8 }, () => 0x07), controlMask: 0xff, provenance }));
    expect(prepareStream({ provenance, words: lateIdles }, { ...policy, maximumDeferralBlocks: 0 }, 39)).toMatchObject({ ok: false, errors: { run: expect.stringMatching(/maximum deferral/i) } });
  });

  it("uses earliest Idles before a reservation, then permits the bounded post-reservation window only", () => {
    const provenance = blocks(1)[0].provenance;
    const idle = (index: number) => ({ index, octets: Uint8Array.from({ length: 8 }, () => 0x07), controlMask: 0xff, provenance });
    const before = prepareStream({ provenance, words: Array.from({ length: 16 }, (_, index) => idle(index)) }, policy, 38);
    expect(before.ok).toBe(true);
    if (!before.ok) throw new Error(before.errors.run);
    expect(before.value.deletions.map((entry) => entry.originalWordIndex)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(before.value.deletions.every((entry) => entry.reservation.insertionBitOffset === 514)).toBe(true);

    const afterWords = Array.from({ length: 16 }, (_, index) => index < 8 ? { index, octets: Uint8Array.of(0xfb, 1, 2, 3, 4, 5, 6, 7), controlMask: 1, provenance } : idle(index));
    const within = prepareStream({ provenance, words: afterWords }, { ...policy, maximumDeferralBlocks: 2 }, 38);
    expect(within.ok).toBe(true);
    if (!within.ok) throw new Error(within.errors.run);
    expect(within.value.deletions.map((entry) => entry.originalWordIndex)).toEqual([8, 9, 10, 11, 12, 13, 14, 15]);
    expect(prepareStream({ provenance, words: afterWords }, { ...policy, maximumDeferralBlocks: 1 }, 38)).toMatchObject({ ok: false, errors: { run: expect.stringMatching(/maximum deferral/i) } });
  });

  it("selects the earliest eligible Idles across a reservation boundary", () => {
    const provenance = blocks(1)[0].provenance;
    const idle = (index: number) => ({ index, octets: Uint8Array.from({ length: 8 }, () => 0x07), controlMask: 0xff, provenance });
    const data = (index: number) => ({ index, octets: Uint8Array.of(0xfb, 1, 2, 3, 4, 5, 6, 7), controlMask: 1, provenance });
    const mixed = Array.from({ length: 12 }, (_, index) => index < 7 || index === 8 ? idle(index) : data(index));
    const selected = prepareStream({ provenance, words: mixed }, { ...policy, maximumDeferralBlocks: 1 }, 38);
    expect(selected.ok).toBe(true);
    if (!selected.ok) throw new Error(selected.errors.run);
    expect(selected.value.deletions.map((entry) => entry.originalWordIndex)).toEqual([0, 1, 2, 3, 4, 5, 6, 8]);
    expect(selected.value.deletions.every((entry) => entry.reservation.groupIndex === 1 && entry.reservation.insertionBitOffset === 514)).toBe(true);

    const insufficient = prepareStream({ provenance, words: mixed.filter((word) => word.index !== 8) }, { ...policy, maximumDeferralBlocks: 4 }, 38);
    expect(insufficient).toMatchObject({ ok: false, errors: { run: expect.stringMatching(/enough eligible/i) } });
    const beyond = Array.from({ length: 22 }, (_, index) => index >= 13 && index < 21 ? idle(index) : data(index));
    expect(prepareStream({ provenance, words: beyond }, { ...policy, maximumDeferralBlocks: 1 }, 38)).toMatchObject({ ok: false, errors: { run: expect.stringMatching(/maximum deferral/i) } });
  });

  it("deep-freezes ledger entries supplied to marker planning", () => {
    const mutable = { originalWordIndex: 0, originalOctetOffset: 0, originalBitOffset: 0, idleOctets: [7, 7, 7, 7, 7, 7, 7, 7], controlMask: 0xff, policyId: policy.id, reason: "alignment-marker-reservation" as const, reservation: { groupIndex: 0, insertionBitOffset: 0, fecPairIndex: 0, boundaryKind: "am-group" as const } };
    const plan = planMarkers(blocks(1), policy, { absoluteStreamBlock: 0 }, Object.freeze([mutable]));
    if (!plan.ok) throw new Error(plan.errors.run);
    expect(Object.isFrozen(plan.value.deletions[0])).toBe(true);
    expect(Object.isFrozen(plan.value.deletions[0].reservation)).toBe(true);
    expect(Object.isFrozen(plan.value.deletions[0].idleOctets)).toBe(true);
    const result = insertMarkers(Uint8Array.from({ length: 257 }, () => 0), plan.value, Uint8Array.from({ length: 9 }, () => 1));
    if (!result.ok) throw new Error(result.errors.run);
    expect(Object.isFrozen(result.value.deletions[0].reservation)).toBe(true);
  });
});
