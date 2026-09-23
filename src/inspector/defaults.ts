import type { FrameDraft, PmaMappingProfile, StreamConfig } from "./types";

export const DEFAULT_FRAME: Readonly<FrameDraft> = Object.freeze({
  destination: "02:00:00:00:00:02",
  source: "02:00:00:00:00:01",
  etherType: "88B5",
  payloadHex: "000102030405060708090A0B0C0D0E0F101112131415161718191A1B1C1D1E1F202122232425262728292A2B2C2D2E2F303132333435363738393A3B3C3D3E3F",
});

/** Requested teaching state, pending verification of recurrence and phase rules. */
export const DEFAULT_STREAM: Readonly<StreamConfig> = Object.freeze({
  scramblerSeedHex: "3FFFFFFFFFFFFFF",
  markerPrbsSeed: 0x1ff,
  markerBlockPhase: 0,
  lanePhase: 0,
  prefixIdleOctets: 4096,
});

/** Application allocation limit, not an IEEE protocol constant. */
export const MAX_CODED_BITS = 262_144;

/**
 * Project-owned schedule declaration for the experimental reference contract.
 * It is not an IEEE-defined PMA order and has no admitted output fixture yet.
 */
export const REFERENCE_PMA_MAPPING: Readonly<PmaMappingProfile> = Object.freeze({
  id: "reference-16x4-bit-mux-v1",
  kind: "implementation-specific-reference",
  sourceRevision: "project-owned-reference-pma-v1",
  fixtureId: "independent-local-fixture-pending",
  periodBits: 4,
  sourcePcsLaneByPmdLane: Object.freeze([
    Object.freeze([0, 1, 2, 3] as const),
    Object.freeze([4, 5, 6, 7] as const),
    Object.freeze([8, 9, 10, 11] as const),
    Object.freeze([12, 13, 14, 15] as const),
  ] as const),
  initialPhase: 0,
  firstBitSignificance: "msb",
  grayLevels: Object.freeze({ "00": -3, "01": -1, "11": 1, "10": 3 }),
  precoder: Object.freeze({ mode: "none" as const }),
});
