import { UNRESOLVED_RULE_IDS } from "./engine/referenceTables";
import type { Profile } from "./types";

/** Candidate metadata, not a verified computation capability. */
export const PROFILE: Readonly<Profile> = Object.freeze({
  id: "400gbase-dr4-tx-v1",
  label: "400GBASE-DR4 transmit (verification blocked)",
  standardEdition: "IEEE Std 802.3-2022",
  referenceIds: Object.freeze([
    "ieee-8023-2022",
    "ieee-bs-d14-cl119-locator",
    "ieee-bs-dr4-geometry-context",
  ]),
  pcsLaneCount: 16,
  physicalLaneCount: 4,
  baudGBd: 53.125,
});

export const PROFILE_VERIFICATION = Object.freeze({
  status: "blocked" as const,
  unresolvedRuleIds: UNRESOLVED_RULE_IDS,
  reason: "Profile verification is blocked: published MAC, RS/CDMII, PCS, PMA and DR4 rules and independent vectors have not been verified. See docs/inspector-profile.md.",
});

export function getProfileSupport(rate: string, dir: string, gen: string): { supported: boolean; reason: string } {
  if (rate !== "400G") {
    return { supported: false, reason: "The intended inspector profile is limited to 400G." };
  }
  if (dir !== "tx") {
    return { supported: false, reason: "The intended inspector profile supports transmit only." };
  }
  if (gen !== "100") {
    return { supported: false, reason: "The intended inspector profile requires 100G per physical lane." };
  }
  // Matching a profile's selection is insufficient to claim verified computation.
  return { supported: false, reason: PROFILE_VERIFICATION.reason };
}
