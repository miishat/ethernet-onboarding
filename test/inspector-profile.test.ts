import { describe, expect, it } from "vitest";
import { DEFAULT_FRAME, DEFAULT_STREAM } from "../src/inspector/defaults";
import { REFERENCE_SOURCES } from "../src/inspector/engine/referenceTables";
import { getProfileSupport, PROFILE, PROFILE_VERIFICATION } from "../src/inspector/profiles";

describe("inspector profile capability gate", () => {
  it.fails("requires every normative rule and fixture before enabling PCS calculation", () => {
    expect(PROFILE_VERIFICATION.unresolvedRuleIds).toEqual([]);
    expect(
      (PROFILE_VERIFICATION as { fixtureIds?: readonly string[] }).fixtureIds ?? [],
    ).toContain("ieee-8023-2022-119a-400g-idle-am");
  });

  it("keeps the intended 400G transmit profile unavailable until its rules are verified", () => {
    const support = getProfileSupport("400G", "tx", "100");
    expect(support.supported).toBe(false);
    expect(support.reason).toMatch(/verification.*blocked/i);
    expect(PROFILE_VERIFICATION.status).toBe("blocked");
    expect(PROFILE_VERIFICATION.unresolvedRuleIds.length).toBeGreaterThan(0);
  });

  it("records the experimental reference profile as metadata-only with immutable disclosures", () => {
    expect(getProfileSupport("400G", "tx", "100").supported).toBe(false);

    const experimentalProfile = REFERENCE_SOURCES.find(
      (source) => source.id === "400gbase-dr4-tx-reference-pma-v1",
    ) as {
      availability: string;
      runtimeSupport: string;
      provenanceLabels: readonly string[];
    };

    expect(experimentalProfile).toMatchObject({
      id: "400gbase-dr4-tx-reference-pma-v1",
      availability: "metadata-only",
      runtimeSupport: "not-implemented",
      standardsConformance: "not-claimed",
      independentLocalFixturePolicy: "required-before-expected-output-admission",
    });
    expect(experimentalProfile.provenanceLabels).toEqual([
      "Experimental reference using candidate contracts",
      "Candidate IEEE source",
      "Independent local fixture",
      "Not IEEE verified or standards conformant",
    ]);
    expect(Object.isFrozen(experimentalProfile.provenanceLabels)).toBe(true);
    expect(() => (experimentalProfile.provenanceLabels as string[]).push("unlabeled")).toThrow();
  });

  it("resolves every experimental candidate source ID through the runtime source inventory", () => {
    const experimentalProfile = REFERENCE_SOURCES.find(
      (source) => source.id === "400gbase-dr4-tx-reference-pma-v1",
    ) as { candidateSourceIds: readonly string[] };
    const sourceIds = new Set(REFERENCE_SOURCES.map((source) => source.id));

    expect(experimentalProfile.candidateSourceIds.every((id) => sourceIds.has(id))).toBe(true);
  });

  it.each([
    ["400G", "rx", "100", /transmit/i],
    ["800G", "tx", "100", /400G/],
    ["1.6T", "tx", "200", /400G/],
    ["400G", "tx", "200", /100/],
    ["", "tx", "100", /400G/],
    ["400G", "", "100", /transmit/i],
    ["400G", "tx", "", /100/],
  ])("rejects unsupported selection %s/%s/%s with an actionable reason", (rate, dir, gen, reason) => {
    expect(getProfileSupport(rate, dir, gen)).toEqual({
      supported: false,
      reason: expect.stringMatching(reason),
    });
  });

  it("does not let a consumer mutate the global profile and bypass the blocked state", () => {
    expect(() => Object.assign(PROFILE, { id: "unverified-profile" })).toThrow();
    expect(() => Object.assign(PROFILE_VERIFICATION, { status: "verified" })).toThrow();
    expect(() => (PROFILE_VERIFICATION.unresolvedRuleIds as string[]).splice(0)).toThrow();
    expect(getProfileSupport("400G", "tx", "100").supported).toBe(false);
  });
});

describe("inspector teaching defaults", () => {
  it("provides the requested local experimental frame draft", () => {
    expect(DEFAULT_FRAME).toEqual({
      destination: "02:00:00:00:00:02",
      source: "02:00:00:00:00:01",
      etherType: "88B5",
      payloadHex: "000102030405060708090A0B0C0D0E0F101112131415161718191A1B1C1D1E1F202122232425262728292A2B2C2D2E2F303132333435363738393A3B3C3D3E3F",
    });
  });

  it("preserves the requested seed and phase intent without enabling unverified computation", () => {
    expect(DEFAULT_STREAM).toEqual({
      scramblerSeedHex: "3FFFFFFFFFFFFFF",
      markerPrbsSeed: 0x1ff,
      markerBlockPhase: 0,
      lanePhase: 0,
      prefixIdleOctets: 4096,
    });
    expect(getProfileSupport("400G", "tx", "100").supported).toBe(false);
  });

  it("keeps defaults stable when a consumer edits its own draft", () => {
    const frame = { ...DEFAULT_FRAME };
    const stream = { ...DEFAULT_STREAM };
    frame.payloadHex = "FF";
    stream.prefixIdleOctets = 0;
    expect(DEFAULT_FRAME.payloadHex).toHaveLength(128);
    expect(DEFAULT_STREAM.prefixIdleOctets).toBe(4096);
    expect(() => Object.assign(DEFAULT_FRAME, { payloadHex: "" })).toThrow();
    expect(() => Object.assign(DEFAULT_STREAM, { prefixIdleOctets: 0 })).toThrow();
  });
});
