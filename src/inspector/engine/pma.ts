import type { PmaMappingProfile } from "../types";

export interface PhysicalLaneResult {
  readonly lanes: readonly Uint8Array[];
  readonly startAbsoluteBit: number;
  readonly nextAbsoluteBit: number;
  readonly nextState: PmaMuxState;
  /** Source PCSL for every returned PMD bit, retained for window traceability. */
  readonly sourcePcsLaneTraceByPmdLane: readonly (readonly number[])[];
}

export interface PmaMuxState {
  readonly absoluteOutputBit: number;
  /** Absolute source-bit offsets, one for each of the sixteen PCS lanes. */
  readonly consumedBitsByPcsLane: readonly number[];
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
  const sources = profile.sourcePcsLaneByPmdLane.flat();
  if (new Set(sources).size !== 16) {
    throw new RangeError("PMA schedules must assign each PCS lane exactly once per period.");
  }
}

function initialState(absoluteOutputBit: number): PmaMuxState {
  if (!Number.isSafeInteger(absoluteOutputBit) || absoluteOutputBit < 0) {
    throw new RangeError("PMA absolute output bit must be a nonnegative safe integer.");
  }
  return { absoluteOutputBit, consumedBitsByPcsLane: Array.from({ length: 16 }, () => 0) };
}

function assertState(state: PmaMuxState): void {
  if (!Number.isSafeInteger(state.absoluteOutputBit) || state.absoluteOutputBit < 0) {
    throw new RangeError("PMA state requires a nonnegative safe absolute output bit.");
  }
  if (state.consumedBitsByPcsLane.length !== 16) {
    throw new RangeError("PMA state requires offsets for all 16 PCS lanes.");
  }
  for (const offset of state.consumedBitsByPcsLane) {
    if (!Number.isSafeInteger(offset) || offset < 0) {
      throw new RangeError("PMA source offsets must be nonnegative safe integers.");
    }
  }
}

/**
 * Applies the selected project-owned 16:4 bit mux. Each input PCSL supplies
 * the same number of bits and is consumed in order whenever its schedule slot
 * occurs. A `PmaMuxState` carries both mux phase and each PCSL's absolute
 * source offset, permitting a window to resume at any output-bit boundary.
 * This is not a universal IEEE PMA ordering.
 */
export function mapPhysicalLanes(
  pcs: readonly Uint8Array[],
  profile: PmaMappingProfile,
  stateOrAbsoluteOutputBit: PmaMuxState | number,
  outputBitCount?: number,
): PhysicalLaneResult {
  if (pcs.length !== 16) throw new RangeError("PMA mapping requires exactly 16 PCS bit streams.");
  assertProfile(profile);
  const startState = typeof stateOrAbsoluteOutputBit === "number"
    ? initialState(stateOrAbsoluteOutputBit)
    : stateOrAbsoluteOutputBit;
  assertState(startState);
  const laneLength = pcs[0]?.length ?? 0;
  for (const lane of pcs) {
    if (lane.length !== laneLength) throw new RangeError("PMA PCS streams must have equal length.");
    assertBinary(lane);
  }

  const defaultOutputCount = (laneLength - Math.max(...startState.consumedBitsByPcsLane)) * profile.periodBits;
  const count = outputBitCount ?? defaultOutputCount;
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new RangeError("PMA output bit count must be a nonnegative safe integer.");
  }

  const consumed = Array.from(startState.consumedBitsByPcsLane);
  const traces: number[][] = [];
  const lanes = profile.sourcePcsLaneByPmdLane.map((schedule) => {
    const output = new Uint8Array(count);
    const trace: number[] = [];
    for (let time = 0; time < count; time += 1) {
      const phase = (profile.initialPhase + startState.absoluteOutputBit + time) % profile.periodBits;
      const sourceLane = schedule[phase];
      if (consumed[sourceLane] >= laneLength) {
        throw new RangeError("PMA output bit count exceeds available PCS source bits.");
      }
      output[time] = pcs[sourceLane][consumed[sourceLane]];
      consumed[sourceLane] += 1;
      trace.push(sourceLane);
    }
    traces.push(trace);
    return output;
  });

  const nextAbsoluteBit = startState.absoluteOutputBit + count;
  const nextState = Object.freeze({
    absoluteOutputBit: nextAbsoluteBit,
    consumedBitsByPcsLane: Object.freeze(consumed),
  });
  return Object.freeze({
    lanes: Object.freeze(lanes),
    startAbsoluteBit: startState.absoluteOutputBit,
    nextAbsoluteBit,
    nextState,
    sourcePcsLaneTraceByPmdLane: Object.freeze(traces.map((trace) => Object.freeze(trace))),
  });
}
