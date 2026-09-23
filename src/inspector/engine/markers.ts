import type { RateMatchDeletion, Result, RateMatchPolicy } from "../types";
import type { Block257 } from "./transcode257";
import { freezeRateMatchLedger } from "./stream";

export interface MarkerPhase { absoluteStreamBlock: number; }
export type MarkerPrbsState = Uint8Array;
export interface MarkerReservation { groupIndex: number; inputBlockIndex: number; insertionBitOffset: number; reservationBlocks: number; fecPairIndex: number; }
export interface MarkerPlan { reservations: readonly MarkerReservation[]; reservationBits: number; deletions: readonly RateMatchDeletion[]; provenance: { sourceId: "ieee-8023-2022-cl119-am"; policyId: "product-owned-reference-am-values-v1"; status: "experimental-candidate"; }; }
export interface MarkerResult { bits: Uint8Array; state: MarkerPrbsState; plan: MarkerPlan; deletions: readonly RateMatchDeletion[]; provenance: MarkerPlan["provenance"]; }

const PROVENANCE = Object.freeze({ sourceId: "ieee-8023-2022-cl119-am" as const, policyId: "product-owned-reference-am-values-v1" as const, status: "experimental-candidate" as const });

function validPolicy(policy: RateMatchPolicy): string | undefined {
  const { cadenceBlocks, reservationBlocks, fecPairBlocks } = policy.amSchedule;
  if (!Number.isInteger(cadenceBlocks) || cadenceBlocks <= 0 || !Number.isInteger(reservationBlocks) || reservationBlocks <= 0 || !Number.isInteger(fecPairBlocks) || fecPairBlocks <= 0) return "The product-owned marker policy requires positive integral block sizes.";
  if (cadenceBlocks !== 163840 || reservationBlocks !== 8 || fecPairBlocks !== 40 || policy.amSchedule.phaseZeroAbsoluteStreamBlock !== 0) return "The experimental reference AM policy uses the final 400G schedule: eight blocks at the beginning of each 40-block FEC pair, every 163840 blocks.";
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
  const immutableDeletions = freezeRateMatchLedger(deletions);
  return { ok: true, value: { reservations: Object.freeze(reservations), reservationBits: reservationBlocks * 257, deletions: immutableDeletions, provenance: PROVENANCE } };
}

function nextPrbs(state: Uint8Array): number {
  const output = state[8];
  const feedback = state[8] ^ state[4];
  state.copyWithin(1, 0, 8);
  state[0] = feedback;
  return output;
}

const AM_LANE_OCTETS = [
  "9a4a26b665b5d9d90171f326fe8e0c", "9a4a260465b5d9675ade7e98a52181",
  "9a4a264665b5d9fe3ef35601c10ca9", "9a4a265a65b5d9848680d07b797f2f",
  "9a4a26e165b5d9192a51f2e6d5ae0d", "9a4a26f265b5d94e124fd1b1fdb02e",
  "9a4a263d65b5d9ee429ca111bd635e", "9a4a262265b5d932d6765bcd2989a4",
  "9a4a266065b5d99fe17375601e8c8a", "9a4a266b65b5d9a271c43c5d8e3bc3",
  "9a4a26fa65b5d90495ebd8fb6a1427", "9a4a266c65b5d9712266388edd99c7",
  "9a4a261865b5d95b2af695a45d096a", "9a4a261465b5d9cc3197c333ce683c",
  "9a4a26d065b5d9b1cafba64e350459", "9a4a26b465b5d956a6ba79a9594586",
] as const;

function laneBits(hex: string): Uint8Array {
  const bits = new Uint8Array(120);
  for (let octet = 0; octet < 15; octet += 1) {
    const value = Number.parseInt(hex.slice(octet * 2, octet * 2 + 2), 16);
    for (let bit = 0; bit < 8; bit += 1) bits[octet * 8 + bit] = (value >>> bit) & 1;
  }
  return bits;
}

const AM_LANES = AM_LANE_OCTETS.map(laneBits);

function markerBits(state: Uint8Array): Uint8Array {
  const marker = new Uint8Array(2056);
  for (let symbol = 0; symbol < 12; symbol += 1) {
    for (let pair = 0; pair < 8; pair += 1) {
      const lanes = symbol % 2 === 0 ? [pair * 2, pair * 2 + 1] : [pair * 2 + 1, pair * 2];
      for (let bit = 0; bit < 10; bit += 1) {
        marker[symbol * 160 + pair * 20 + bit] = AM_LANES[lanes[0]][symbol * 10 + bit];
        marker[symbol * 160 + pair * 20 + 10 + bit] = AM_LANES[lanes[1]][symbol * 10 + bit];
      }
    }
  }
  for (let bit = 1920; bit < 2053; bit += 1) marker[bit] = nextPrbs(state);
  // tx_am_sf is product-owned in this reference because the source that
  // defines status behavior is outside the admitted executable scope.
  marker[2053] = 0; marker[2054] = 0; marker[2055] = 0;
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
    chunks.push(markerBits(carried));
    cursor = reservation.insertionBitOffset;
  }
  chunks.push(scrambled.slice(cursor));
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const bits = new Uint8Array(total); let offset = 0;
  for (const chunk of chunks) { bits.set(chunk, offset); offset += chunk.length; }
  return { ok: true, value: { bits, state: carried, plan, deletions: plan.deletions, provenance: plan.provenance } };
}
