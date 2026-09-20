import type { FrameDraft, StreamConfig } from "./types";

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
