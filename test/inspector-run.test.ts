import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
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

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`).join(",")}}`;
  }
  return JSON.stringify(value);
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

  it("rejects the blocked IEEE-only profile before constructing a run", () => {
    const ieeeOnly = { ...input(), profileId: "400gbase-dr4-tx-v1" as const };
    expect(estimateRunSize(ieeeOnly)).toMatchObject({
      ok: false,
      errors: { run: expect.stringMatching(/experimental reference calculation contract/i) },
    });
    expect(buildInspectorRun(ieeeOnly)).toMatchObject({
      ok: false,
      errors: { run: expect.stringMatching(/experimental reference calculation contract/i) },
    });
  });

  it("keeps the requested MAC frame whole and records half-open trace edges", () => {
    const run = buildInspectorRun(input());
    if (!run.ok) throw new Error(run.errors.run);
    const macOutput = run.value.trace.find((edge) => edge.output.stage === "mac");
    expect(macOutput?.output).toMatchObject({ start: 0, count: run.value.mac.bytes.length });
    expect(run.value.trace.every((edge) => edge.output.start >= 0 && edge.output.count >= 0)).toBe(true);
    expect(run.value.deletions.every((deletion) => deletion.reason === "alignment-marker-reservation" || deletion.reason === "trailing-fec-completion")).toBe(true);
  });

  it("records exact PCS-to-PMD and PMD-to-PAM4 trace spans", () => {
    const result = buildInspectorRun(input());
    if (!result.ok) throw new Error(result.errors.run);
    const run = result.value;
    const pmdBit = run.trace.find((item) => item.output.stage === "physical-lanes" && item.output.start === 2 * 2720 + 70);
    expect(pmdBit).toMatchObject({ output: { count: 1 }, precision: "exact", inputs: [{ stage: "pcs-lanes", bufferId: "pcs-lanes", count: 1 }] });
    const pam4Symbol = run.trace.find((item) => item.output.stage === "pam4" && item.output.start === 2 * 1360 + 35);
    expect(pam4Symbol).toMatchObject({ output: { count: 1 }, precision: "exact", inputs: [{ stage: "physical-lanes", bufferId: "pmd-lanes", start: 2 * 2720 + 70, count: 2 }] });
    expect(run.trace.filter((item) => item.precision === "aggregate")).not.toHaveLength(0);
  });

  it("does not expose mutable run-state arrays", () => {
    const run = buildInspectorRun(input());
    if (!run.ok) throw new Error(run.errors.run);
    expect(() => { (run.value.txScrambledAmBits as number[])[0] = 1; }).toThrow();
    expect(() => { (run.value.scramblerState as number[])[0] = 0; }).toThrow();
    expect(() => { (run.value.mac.bytes as number[])[0] = 1; }).toThrow();
    expect(() => { (run.value.snapshots[0].buffers[0].values as number[])[0] = 1; }).toThrow();
  });

  it("matches the independently generated default-run artifact while its admission is pending review", () => {
    const run = buildInspectorRun(input());
    if (!run.ok) throw new Error(run.errors.run);
    const buffer = (stage: string) => run.value.snapshots.find((snapshot) => snapshot.stage === stage)?.buffers[0].values;
    const hashBits = (bits: Uint8Array) => createHash("sha256").update(Array.from(bits).join(""), "ascii").digest("hex");

    expect(fixture.status).toBe("independently-reviewed-experimental-only");
    expect(fixture.review).toMatchObject({
      reviewerId: "/root/inspector_run_review_light",
      reviewedOn: "2026-09-24",
      reviewedCommit: "8dedfd1",
      result: "accepted-experimental-only",
    });
    expect(fixture.artifact.input).toEqual({
      frameDraft: DEFAULT_FRAME,
      frameInput: { destination: [2, 0, 0, 0, 0, 2], source: [2, 0, 0, 0, 0, 1], etherType: 0x88b5, payload: Array.from({ length: 64 }, (_, index) => index) },
      streamConfig: DEFAULT_STREAM,
    });
    const referencePath = fileURLToPath(new URL("../scripts/inspector-reference.py", import.meta.url));
    expect(createHash("sha256").update(readFileSync(referencePath)).digest("hex")).toBe(fixture.reference.sha256);
    expect(createHash("sha256").update(canonicalJson(fixture.artifact), "ascii").digest("hex")).toBe(fixture.artifactSha256);
    const markerPath = fileURLToPath(new URL("../scripts/marker-reference.py", import.meta.url));
    expect(createHash("sha256").update(readFileSync(markerPath)).digest("hex")).toBe(fixture.artifact.markerReference.scriptSha256);
    const marker = spawnSync("python", [markerPath, "--json"], { encoding: "utf8" });
    expect(marker.status, marker.stderr).toBe(0);
    expect(JSON.parse(marker.stdout)).toMatchObject({ sha256: fixture.artifact.markerReference.outputBitsSha256, prbsStateLsbToMsb: fixture.artifact.markerReference.outputPrbsStateLsbToMsb });
    const independent = spawnSync("python", [referencePath, "--run-json"], { encoding: "utf8" });
    expect(independent.status, independent.stderr).toBe(0);
    const independentArtifact = JSON.parse(independent.stdout);
    expect(independentArtifact).toEqual(fixture);
    expect(Buffer.from(run.value.mac.bytes).toString("hex")).toBe(fixture.artifact.macHex);
    expect(run.value.deletions.map((deletion) => deletion.originalWordIndex)).toEqual(fixture.artifact.deletedWordIndexes);
    expect(hashBits(buffer("encode66") as Uint8Array)).toBe(fixture.artifact.stageHashes.encode66);
    expect(hashBits(buffer("transcode257") as Uint8Array)).toBe(fixture.artifact.stageHashes.transcode257);
    expect(hashBits(buffer("scramble") as Uint8Array)).toBe(fixture.artifact.stageHashes.scramble);
    expect(hashBits(Uint8Array.from(run.value.txScrambledAmBits))).toBe(fixture.artifact.stageHashes.markers);
    const hashJson = (value: unknown) => createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
    expect(run.value.fecMessages.map(hashJson)).toEqual(fixture.artifact.stageHashes.messages);
    expect(run.value.codewords.map(hashJson)).toEqual(fixture.artifact.stageHashes.codewords);
    const laneHashes = (stage: string, width: number, transform = (value: number) => value) => {
      const values = Array.from(buffer(stage) as Uint8Array);
      return Array.from({ length: values.length / width }, (_, lane) => hashBits(Uint8Array.from(values.slice(lane * width, (lane + 1) * width).map(transform))));
    };
    expect(laneHashes("pcs-lanes", 2720)).toEqual(fixture.artifact.stageHashes.pcsLanes);
    expect(laneHashes("physical-lanes", 10880)).toEqual(fixture.artifact.stageHashes.pmdLanes);
    const pam4Values = Array.from(buffer("pam4") as Uint8Array);
    expect(Array.from({ length: 4 }, (_, lane) => hashJson(pam4Values.slice(lane * 5440, (lane + 1) * 5440).map((value) => value - 3))))
      .toEqual(fixture.artifact.stageHashes.pam4);
    expect(Array.from(buffer("physical-lanes") as Uint8Array).slice(0, 32).join("")).toBe(fixture.artifact.selectedBoundaryValues.firstPmdBits);
  });
});
