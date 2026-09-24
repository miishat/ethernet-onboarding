import type { PmaMappingProfile } from "../types";

export interface Pam4Result {
  readonly labels: readonly ("00" | "01" | "11" | "10")[];
  readonly normalizedLevels: Int8Array;
  readonly unit: "normalized-level";
}

function assertBinary(bits: Uint8Array): void {
  for (const bit of bits) {
    if (bit !== 0 && bit !== 1) throw new RangeError("PAM4 input must contain binary bits.");
  }
}

/**
 * Converts a PMD bit stream to the profile's declared Gray labels and
 * normalized levels. The first bit of each dibit is the MSB in this selected
 * reference mapping. Levels are labels only, never measured voltage or power.
 */
export function mapPam4(bits: Uint8Array, profile: PmaMappingProfile): Pam4Result {
  if (bits.length % 2 !== 0) throw new RangeError("PAM4 mapping requires an even number of bits.");
  assertBinary(bits);
  if (profile.firstBitSignificance !== "msb") {
    throw new RangeError("PAM4 mapping requires a declared MSB-first dibit convention.");
  }
  if (profile.precoder.mode !== "none") {
    throw new RangeError("PAM4 precoder modes require a separately reviewed state contract.");
  }

  const labels: ("00" | "01" | "11" | "10")[] = [];
  const normalizedLevels = new Int8Array(bits.length / 2);
  for (let offset = 0; offset < bits.length; offset += 2) {
    const label = `${bits[offset]}${bits[offset + 1]}` as "00" | "01" | "10" | "11";
    if (label !== "00" && label !== "01" && label !== "11" && label !== "10") {
      throw new RangeError("PAM4 input must form binary dibits.");
    }
    labels.push(label);
    normalizedLevels[offset / 2] = profile.grayLevels[label];
  }

  return Object.freeze({ labels: Object.freeze(labels), normalizedLevels, unit: "normalized-level" });
}
