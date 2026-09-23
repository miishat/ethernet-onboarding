import type { RateMatchDeletion, Result, RateMatchPolicy } from "../types";
import type { Block257 } from "./transcode257";

export interface MarkerPhase { absoluteStreamBlock: number; }
export type MarkerPrbsState = Uint8Array;
export interface MarkerReservation { groupIndex: number; inputBlockIndex: number; insertionBitOffset: number; reservationBlocks: number; fecPairIndex: number; }
export interface MarkerPlan { reservations: readonly MarkerReservation[]; reservationBits: number; deletions: readonly RateMatchDeletion[]; provenance: { sourceId: "ieee-bs-d14-cl119-locator"; policyId: "product-owned-reference-am-values-v1"; status: "experimental-candidate"; }; }
export interface MarkerResult { bits: Uint8Array; state: MarkerPrbsState; plan: MarkerPlan; deletions: readonly RateMatchDeletion[]; provenance: MarkerPlan["provenance"]; }

const PROVENANCE = Object.freeze({ sourceId: "ieee-bs-d14-cl119-locator" as const, policyId: "product-owned-reference-am-values-v1" as const, status: "experimental-candidate" as const });

function validPolicy(policy: RateMatchPolicy): string | undefined {
  const { cadenceBlocks, reservationBlocks, fecPairBlocks } = policy.amSchedule;
  if (!Number.isInteger(cadenceBlocks) || cadenceBlocks <= 0 || !Number.isInteger(reservationBlocks) || reservationBlocks <= 0 || !Number.isInteger(fecPairBlocks) || fecPairBlocks <= 0) return "The product-owned marker policy requires positive integral block sizes.";
  if (cadenceBlocks % fecPairBlocks !== 0 || reservationBlocks % fecPairBlocks !== 0) return "Marker cadence and reservation must align to complete FEC pairs.";
  return undefined;
}

export function planMarkers(blocks: readonly Block257[], policy: RateMatchPolicy, phase: MarkerPhase, deletions: readonly RateMatchDeletion[] = []): Result<MarkerPlan> {
  const error = validPolicy(policy);
  if (error) return { ok: false, errors: { run: error } };
  if (!Number.isInteger(phase.absoluteStreamBlock) || phase.absoluteStreamBlock < 0) return { ok: false, errors: { run: "Marker phase must be a nonnegative absolute block index." } };
  const { cadenceBlocks, reservationBlocks, fecPairBlocks, phaseZeroAbsoluteStreamBlock } = policy.amSchedule;
  const reservations: MarkerReservation[] = [];
  for (let index = 0; index < blocks.length; index += 1) {
    const absolute = phase.absoluteStreamBlock + index;
    const relative = absolute - phaseZeroAbsoluteStreamBlock;
    if (relative >= 0 && relative % cadenceBlocks === 0) reservations.push({ groupIndex: relative / cadenceBlocks, inputBlockIndex: index, insertionBitOffset: index * 257, reservationBlocks, fecPairIndex: absolute / fecPairBlocks });
  }
  const immutableDeletions = Object.isFrozen(deletions) ? deletions : Object.freeze([...deletions]);
  return { ok: true, value: { reservations: Object.freeze(reservations), reservationBits: reservationBlocks * 257, deletions: immutableDeletions, provenance: PROVENANCE } };
}

function nextPrbs(state: Uint8Array): number {
  const output = state[8];
  const feedback = state[8] ^ state[4];
  state.copyWithin(1, 0, 8);
  state[0] = feedback;
  return output;
}

function markerBits(size: number, state: Uint8Array, groupIndex: number): Uint8Array {
  const marker = new Uint8Array(size);
  // Product-owned AM layout: 16-bit common value, 16-bit status value 0x0001,
  // 16-bit group identifier, then a PRBS9 pad. These are reference policy
  // values, not an inferred final IEEE layout.
  for (let bit = 0; bit < Math.min(16, size); bit += 1) marker[bit] = (0xa55a >>> bit) & 1;
  for (let bit = 16; bit < Math.min(32, size); bit += 1) marker[bit] = (0x0001 >>> (bit - 16)) & 1;
  for (let bit = 32; bit < Math.min(48, size); bit += 1) marker[bit] = (groupIndex >>> (bit - 32)) & 1;
  for (let bit = 48; bit < size; bit += 1) marker[bit] = nextPrbs(state);
  return marker;
}

export function insertMarkers(scrambled: Uint8Array, plan: MarkerPlan, state: MarkerPrbsState): Result<MarkerResult> {
  if (state.length !== 9 || [...state].some((bit) => bit !== 0 && bit !== 1)) return { ok: false, errors: { run: "The product-owned marker PRBS state requires nine binary bits." } };
  if ([...scrambled].some((bit) => bit !== 0 && bit !== 1)) return { ok: false, errors: { run: "Marker insertion requires binary scrambled bits." } };
  const carried = Uint8Array.from(state);
  const chunks: Uint8Array[] = [];
  let cursor = 0;
  for (const reservation of plan.reservations) {
    if (reservation.insertionBitOffset < cursor || reservation.insertionBitOffset > scrambled.length) return { ok: false, errors: { run: "Marker plan contains an invalid insertion boundary." } };
    chunks.push(scrambled.slice(cursor, reservation.insertionBitOffset));
    chunks.push(markerBits(plan.reservationBits, carried, reservation.groupIndex));
    cursor = reservation.insertionBitOffset;
  }
  chunks.push(scrambled.slice(cursor));
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const bits = new Uint8Array(total); let offset = 0;
  for (const chunk of chunks) { bits.set(chunk, offset); offset += chunk.length; }
  return { ok: true, value: { bits, state: carried, plan, deletions: plan.deletions, provenance: plan.provenance } };
}
