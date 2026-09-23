import { UNRESOLVED_RULE_IDS } from "./engine/referenceTables";
import type { CalculationContract, InspectorStage, Profile, ProfileId, StageSupport } from "./types";

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

/**
 * Declares the project-owned reference PMA contract for future consumers.
 * `declared-contract-only` means no stage calculation is implemented or IEEE verified.
 */
export const EXPERIMENTAL_REFERENCE_CALCULATION_CONTRACT: Readonly<CalculationContract> = Object.freeze({
  id: "400gbase-dr4-tx-reference-pma-v1",
  label: "400GBASE-DR4 with Reference 16-to-4 mapping",
  provenance: "reference-mapping",
  declaredStages: Object.freeze(["physical-lanes", "pam4"] as const),
  executionStatus: "declared-contract-only",
  reason: "Experimental reference mapping is a declared contract, not an implemented calculation. It is not IEEE verified or standards conformant.",
  referenceIds: Object.freeze([
    "400gbase-dr4-tx-reference-pma-v1",
    "ieee-bs-d14-cl119-locator",
    "ieee-bs-dr4-geometry-context",
    "itu-g7095-2024-cor1-rs544",
    "ieee-df-172a-rs-candidate",
    "ieee-df-172a-input-candidate",
  ]),
});

/**
 * Reports declared contract availability for a stage. A supported experimental
 * declaration never asserts that the corresponding calculation is implemented.
 */
export function getStageSupport(profileId: ProfileId, stage: InspectorStage): StageSupport {
  if (
    profileId === EXPERIMENTAL_REFERENCE_CALCULATION_CONTRACT.id
    && EXPERIMENTAL_REFERENCE_CALCULATION_CONTRACT.declaredStages.includes(stage)
  ) {
    return {
      supported: true,
      provenance: "reference-mapping",
      reason: EXPERIMENTAL_REFERENCE_CALCULATION_CONTRACT.reason,
      missingRuleIds: UNRESOLVED_RULE_IDS,
    };
  }

  return {
    supported: false,
    provenance: "blocked",
    reason: "No executable calculation contract is available for this stage. The IEEE-only profile remains verification blocked.",
    missingRuleIds: UNRESOLVED_RULE_IDS,
  };
}

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
