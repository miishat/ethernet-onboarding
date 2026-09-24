import type { PmaMappingProfile } from "../types";

export interface PhysicalLaneResult {
  readonly lanes: readonly Uint8Array[];
  readonly startAbsoluteBit: number;
  readonly nextAbsoluteBit: number;
}

function assertBinary(bits: Uint8Array): void {
  for (const bit of bits) {
    if (bit !== 0 && bit !== 1) throw new RangeError("PMA PCS streams must contain binary bits.");
  }
}

function assertProfile(profile: PmaMappingProfile): void {
  if (!Number.isInteger(profile.periodBits) || profile.periodBits <= 0) {
    throw new RangeError("PMA schedule period must be a positive integer.");
  }
  if (profile.sourcePcsLaneByPmdLane.length !== 4) {
    throw new RangeError("PMA mapping requires four PMD lane schedules.");
  }
  for (const schedule of profile.sourcePcsLaneByPmdLane) {
    if (schedule.length !== profile.periodBits) {
      throw new RangeError("Each PMD schedule must cover the declared PMA period.");
    }
    for (const sourceLane of schedule) {
      if (!Number.isInteger(sourceLane) || sourceLane < 0 || sourceLane >= 16) {
        throw new RangeError("PMA schedules must reference PCS lanes 0 through 15.");
      }
    }
  }
}

/**
 * Applies the selected project-owned 16:4 bit mux. Each input PCSL supplies
 * the same number of bits and is consumed in order whenever its schedule slot
 * occurs. `absoluteOutputBit` determines the first schedule phase and carries
 * between windows. This is not a universal IEEE PMA ordering.
 */
export function mapPhysicalLanes(
  pcs: readonly Uint8Array[],
  profile: PmaMappingProfile,
  absoluteOutputBit: number,
): PhysicalLaneResult {
  if (!Number.isSafeInteger(absoluteOutputBit) || absoluteOutputBit < 0) {
    throw new RangeError("PMA absolute output bit must be a nonnegative safe integer.");
  }
  if (pcs.length !== 16) throw new RangeError("PMA mapping requires exactly 16 PCS bit streams.");
  assertProfile(profile);
  const laneLength = pcs[0]?.length ?? 0;
  for (const lane of pcs) {
    if (lane.length !== laneLength) throw new RangeError("PMA PCS streams must have equal length.");
    assertBinary(lane);
  }

  const outputLength = laneLength * profile.periodBits;
  const lanes = profile.sourcePcsLaneByPmdLane.map((schedule) => {
    const output = new Uint8Array(outputLength);
    const consumed = new Uint32Array(16);
    for (let time = 0; time < outputLength; time += 1) {
      const phase = (profile.initialPhase + absoluteOutputBit + time) % profile.periodBits;
      const sourceLane = schedule[phase];
      output[time] = pcs[sourceLane][consumed[sourceLane]];
      consumed[sourceLane] += 1;
    }
    return output;
  });

  return Object.freeze({
    lanes: Object.freeze(lanes),
    startAbsoluteBit: absoluteOutputBit,
    nextAbsoluteBit: absoluteOutputBit + outputLength,
  });
}
