import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { DEFAULT_FRAME, DEFAULT_STREAM, MAX_CODED_BITS, REFERENCE_PMA_MAPPING } from "../src/inspector/defaults";
import { buildInspectorRun, estimateRunSize, REFERENCE_RATE_MATCH_POLICY } from "../src/inspector/engine/run";
import { parseFrame } from "../src/inspector/engine/validation";
import fixture from "./fixtures/inspector/default-frame-reference-pma-v1.json";

function input(prefixIdleOctets = DEFAULT_STREAM.prefixIdleOctets) {
  const frame = parseFrame(DEFAULT_FRAME);
  if (!frame.ok) throw new Error("default frame must parse");
  return {
    frame: frame.value,
    stream: { ...DEFAULT_STREAM, prefixIdleOctets },
    profileId: "400gbase-dr4-tx-reference-pma-v1" as const,
    rateMatchPolicy: REFERENCE_RATE_MATCH_POLICY,
    pmaMappingProfile: REFERENCE_PMA_MAPPING,
  };
}

describe("traceable experimental inspector run", () => {
  it("estimates and accepts an exact bounded complete FEC-pair run", () => {
    const estimated = estimateRunSize(input());
    expect(estimated).toMatchObject({ ok: true, value: { codedBits: expect.any(Number), fecPairCount: expect.any(Number) } });
    if (!estimated.ok) throw new Error(estimated.errors.run);
    expect(estimated.value.codedBits).toBeLessThanOrEqual(MAX_CODED_BITS);
    expect(estimated.value.fecPairCount).toBeGreaterThan(0);

    const run = buildInspectorRun(input());
    expect(run).toMatchObject({ ok: true });
    if (!run.ok) throw new Error(run.errors.run);
    expect(run.value.codedBits).toBe(estimated.value.codedBits);
    expect(run.value.txScrambledAmBits.length % 10280).toBe(0);
    expect(run.value.mac.bytes.length).toBe(82);
    expect(run.value.snapshots.map((snapshot) => snapshot.stage)).toEqual(expect.arrayContaining([
      "mac", "encode66", "transcode257", "scramble", "markers", "fec", "pcs-lanes", "physical-lanes", "pam4",
    ]));
    expect(run.value.provenance.labels).toContain("Experimental reference using candidate contracts");
    expect(Object.isFrozen(run.value)).toBe(true);
  });

  it("rejects a one-bit-over run before coded-stage allocation", () => {
    const tooLarge = input(DEFAULT_STREAM.prefixIdleOctets + MAX_CODED_BITS);
    const estimated = estimateRunSize(tooLarge);
    expect(estimated).toMatchObject({ ok: false, errors: { run: expect.stringMatching(/262144|limit/i) } });
    expect(buildInspectorRun(tooLarge)).toEqual(estimated);
  });

  it("keeps the requested MAC frame whole and records half-open trace edges", () => {
    const run = buildInspectorRun(input());
    if (!run.ok) throw new Error(run.errors.run);
    const macOutput = run.value.trace.find((edge) => edge.output.stage === "mac");
    expect(macOutput?.output).toMatchObject({ start: 0, count: run.value.mac.bytes.length });
    expect(run.value.trace.every((edge) => edge.output.start >= 0 && edge.output.count >= 0)).toBe(true);
    expect(run.value.deletions.every((deletion) => deletion.reason === "alignment-marker-reservation" || deletion.reason === "trailing-fec-completion")).toBe(true);
  });

  it("matches the independently generated default-run artifact while its admission is pending review", () => {
    const run = buildInspectorRun(input());
    if (!run.ok) throw new Error(run.errors.run);
    const buffer = (stage: string) => run.value.snapshots.find((snapshot) => snapshot.stage === stage)?.buffers[0].values;
    const hashBits = (bits: Uint8Array) => createHash("sha256").update(Array.from(bits).join(""), "ascii").digest("hex");

    expect(fixture.status).toBe("pending-independent-review");
    expect(Buffer.from(run.value.mac.bytes).toString("hex")).toBe(fixture.artifact.macHex);
    expect(run.value.deletions.map((deletion) => deletion.originalWordIndex)).toEqual(fixture.artifact.deletedWordIndexes);
    expect(hashBits(buffer("encode66") as Uint8Array)).toBe(fixture.artifact.stageHashes.encode66);
    expect(hashBits(buffer("transcode257") as Uint8Array)).toBe(fixture.artifact.stageHashes.transcode257);
    expect(hashBits(buffer("scramble") as Uint8Array)).toBe(fixture.artifact.stageHashes.scramble);
    expect(hashBits(run.value.txScrambledAmBits)).toBe(fixture.artifact.stageHashes.markers);
    expect(Array.from(buffer("physical-lanes") as Uint8Array).slice(0, 32).join("")).toBe(fixture.artifact.selectedBoundaryValues.firstPmdBits);
  });
});
