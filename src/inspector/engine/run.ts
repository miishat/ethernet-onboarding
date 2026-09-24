import { MAX_CODED_BITS } from "../defaults";
import type {
  CompleteInspectorRun, RateMatchPolicy, Result, RunInput, RunSize,
  Snapshot, TraceEdge,
} from "../types";
import { buildMacFrame } from "./mac";
import { buildInterfaceStream, prepareStream, type InterfaceStream, type InterfaceWord } from "./stream";
import { encode66Block, type Block66 } from "./encode66";
import { transcode257Group, type Block257 } from "./transcode257";
import { scrambleBits } from "./scramble";
import { insertMarkers, planMarkers } from "./markers";
import { distributePcsLanes, encodeClause119Codeword, interleaveClause119, splitFecMessages } from "./distribute";
import { mapPhysicalLanes } from "./pma";
import { mapPam4 } from "./pam4";
import { dataRef, edge, snapshot } from "./trace";

export const REFERENCE_RATE_MATCH_POLICY: Readonly<RateMatchPolicy> = Object.freeze({
  id: "product-owned-reference-am-rate-match-v1",
  source: "project-owned",
  eligibleIdleControlCodes: Object.freeze([0x07]),
  selection: "earliest-eligible-before-reservation",
  tieBreak: "lowest-absolute-word-index",
  maximumDeferralBlocks: 8,
  frameBoundaryRule: "never-remove-frame-data",
  amSchedule: Object.freeze({ unit: "transcoded-257b-block", cadenceBlocks: 163840, reservationBlocks: 8, fecPairBlocks: 40, phaseZeroAbsoluteStreamBlock: 0 }),
});

const LABELS = Object.freeze([
  "Experimental reference using candidate contracts",
  "Candidate IEEE source",
  "Independent local fixture",
  "Not IEEE verified or standards conformant",
] as const);

function runError(message: string): Result<never> { return { ok: false, errors: { run: message } }; }

function baseInterfaceWords(input: RunInput): number {
  const frame = buildMacFrame(input.frame);
  const octets = input.stream.prefixIdleOctets + 8 + frame.bytes.length + 1;
  return Math.ceil(octets / 32) * 4;
}

function markerGroupsFor(absoluteBlock: number): number {
  return absoluteBlock % 163840 === 0 ? 1 : 0;
}

/** Calculates the complete finite window without materializing coded buffers. */
export function estimateRunSize(input: RunInput): Result<RunSize> {
  if (input.profileId !== "400gbase-dr4-tx-reference-pma-v1") return runError("Only the experimental reference calculation contract can build a run.");
  if (!Number.isInteger(input.stream.markerBlockPhase) || input.stream.markerBlockPhase < 0) return runError("Marker block phase must be a nonnegative integer.");
  if (!Number.isInteger(input.stream.prefixIdleOctets) || input.stream.prefixIdleOctets < 0 || input.stream.prefixIdleOctets % 8 !== 0) return runError("The experimental reference prefix must be a multiple of eight Idle octets.");
  const markers = markerGroupsFor(input.stream.markerBlockPhase);
  const baseWords = baseInterfaceWords(input);
  const deletedWords = markers * input.rateMatchPolicy.amSchedule.reservationBlocks * 4;
  if (baseWords < deletedWords) return runError("The requested run does not contain enough complete Idle words for its alignment-marker reservation.");
  const pairBlocks = input.rateMatchPolicy.amSchedule.fecPairBlocks;
  const markerBlocks = markers * input.rateMatchPolicy.amSchedule.reservationBlocks;
  const blocksBeforeCompletion = (baseWords - deletedWords) / 4;
  const completionBlocks = (pairBlocks - ((blocksBeforeCompletion + markerBlocks) % pairBlocks)) % pairBlocks;
  const interfaceWords = baseWords + completionBlocks * 4;
  const transcodedBlocks = (interfaceWords - deletedWords) / 4;
  const fecPairCount = (transcodedBlocks + markerBlocks) / pairBlocks;
  const codedBits = fecPairCount * 2 * 544 * 10;
  if (!Number.isSafeInteger(codedBits) || codedBits > MAX_CODED_BITS) return runError(`The requested run requires ${codedBits} coded bits, exceeding the ${MAX_CODED_BITS}-bit application limit before allocation.`);
  return { ok: true, value: Object.freeze({ interfaceWords, transcodedBlocks, markerGroups: markers, fecPairCount, codedBits }) };
}

function appendTrailingIdles(stream: InterfaceStream, count: number): InterfaceStream {
  const words: InterfaceWord[] = stream.words.map((word) => ({ ...word, octets: word.octets.slice() }));
  for (let index = stream.words.length; index < count; index += 1) {
    words.push({ index, octets: Uint8Array.of(7, 7, 7, 7, 7, 7, 7, 7), controlMask: 0xff, provenance: stream.provenance });
  }
  return Object.freeze({ words: Object.freeze(words), provenance: stream.provenance });
}

function flattenBits(blocks: readonly Block257[]): Uint8Array {
  const bits = new Uint8Array(blocks.length * 257);
  blocks.forEach((block, index) => bits.set(block.bits, index * 257));
  return bits;
}

function symbolsToBits(lanes: readonly Uint16Array[]): readonly Uint8Array[] {
  return Object.freeze(lanes.map((lane) => {
    const bits = new Uint8Array(lane.length * 10);
    lane.forEach((symbol, index) => { for (let bit = 0; bit < 10; bit += 1) bits[index * 10 + bit] = (symbol >>> bit) & 1; });
    return bits;
  }));
}

function value<T>(result: Result<T>): T { if (!result.ok) throw new Error(result.errors.run); return result.value; }

export function buildInspectorRun(input: RunInput): Result<CompleteInspectorRun> {
  const estimated = estimateRunSize(input);
  if (!estimated.ok) return estimated;
  try {
    const mac = buildMacFrame(input.frame);
    const interfaceBase = value(buildInterfaceStream(mac, input.stream.prefixIdleOctets));
    const interfaceStream = appendTrailingIdles(interfaceBase, estimated.value.interfaceWords);
    const prepared = value(prepareStream(interfaceStream, input.rateMatchPolicy, input.stream.markerBlockPhase));
    const blocks66: Block66[] = prepared.stream.words.map((word) => value(encode66Block(word)));
    const blocks257: Block257[] = [];
    for (let index = 0; index < blocks66.length; index += 4) blocks257.push(value(transcode257Group([blocks66[index], blocks66[index + 1], blocks66[index + 2], blocks66[index + 3]])));
    const preScramble = flattenBits(blocks257);
    const seed = input.stream.scramblerSeedHex;
    if (!/^[0-9a-fA-F]{15}$/.test(seed)) return runError("The experimental reference scrambler seed must contain 58 binary predecessor bits.");
    const scramblerState = Uint8Array.from(BigInt(`0x${seed}`).toString(2).padStart(58, "0"), Number);
    const scrambled = scrambleBits(preScramble, scramblerState);
    const markerPlan = value(planMarkers(blocks257, input.rateMatchPolicy, { absoluteStreamBlock: input.stream.markerBlockPhase }, prepared.deletions));
    const marked = value(insertMarkers(scrambled.bits, markerPlan, Uint8Array.from({ length: 9 }, (_, bit) => (input.stream.markerPrbsSeed >>> bit) & 1)));
    if (marked.bits.length % 10280 !== 0) return runError("Run completion failed to produce complete 40-block FEC pairs.");
    const pcsSymbols: Uint16Array[] = Array.from({ length: 16 }, () => new Uint16Array(estimated.value.fecPairCount * 68));
    const fecMessages: Array<readonly [readonly number[], readonly number[]]> = [];
    const codewords: Array<readonly [readonly number[], readonly number[]]> = [];
    for (let pair = 0; pair < estimated.value.fecPairCount; pair += 1) {
      const bits = marked.bits.slice(pair * 10280, (pair + 1) * 10280);
      const messages = splitFecMessages(bits);
      const codewordA = encodeClause119Codeword(messages.messageA);
      const codewordB = encodeClause119Codeword(messages.messageB);
      fecMessages.push(Object.freeze([Object.freeze([...messages.messageA]), Object.freeze([...messages.messageB]) ]));
      codewords.push(Object.freeze([Object.freeze([...codewordA]), Object.freeze([...codewordB]) ]));
      const interleaved = interleaveClause119(codewordA, codewordB);
      const lanes = distributePcsLanes(interleaved);
      lanes.forEach((lane, laneIndex) => pcsSymbols[laneIndex].set(lane, pair * 68));
    }
    const pcsBits = symbolsToBits(pcsSymbols);
    const pma = mapPhysicalLanes(pcsBits, input.pmaMappingProfile, input.stream.lanePhase);
    const pam4 = pma.lanes.map((lane) => mapPam4(lane, input.pmaMappingProfile));
    const snapshots: Snapshot[] = [
      snapshot("mac", "octet", "mac-frame", mac.bytes, "MAC frame from destination through FCS.", ["mac-frame-fcs"]),
      snapshot("encode66", "bit", "64b66b", Uint8Array.from(blocks66.flatMap((block) => [...block.bits])), "Candidate 64B/66B blocks.", ["ieee-bs-d14-cl119-locator"]),
      snapshot("transcode257", "bit", "257b", preScramble, "Candidate 256B/257B transcoding.", ["ieee-8023-2022-cl119-transcode-local"]),
      snapshot("scramble", "bit", "scrambled", scrambled.bits, "Continuous product-owned scrambling recurrence.", ["scramble-reference-policy-v1"]),
      snapshot("markers", "bit", "tx-scrambled-am", marked.bits, "Alignment markers with product-owned PRBS and status choices.", ["marker-reference-policy-v1"]),
      snapshot("fec", "rs-symbol", "pcs-symbols", Uint16Array.from(pcsSymbols.flatMap((lane) => [...lane])), "Clause 119 experimental FEC pair packing and interleave.", ["experimental-cl119-local-400g-am-fec-v1"]),
      snapshot("pcs-lanes", "bit", "pcs-lanes", Uint8Array.from(pcsBits.flatMap((lane) => [...lane])), "Sixteen PCS lane bit streams.", ["experimental-cl119-local-400g-am-fec-v1"]),
      snapshot("physical-lanes", "bit", "pmd-lanes", Uint8Array.from(pma.lanes.flatMap((lane) => [...lane])), "Selected project-owned 16-to-4 PMA mapping.", ["reference-pma-16x4-v1"]),
      snapshot("pam4", "pam4-symbol", "pam4-levels", Uint8Array.from(pam4.flatMap((lane) => [...lane.normalizedLevels].map((level) => level + 3))), "Normalized PAM4 levels, not measured voltage or optical power.", ["reference-pma-16x4-v1"]),
    ];
    const trace: TraceEdge[] = [
      edge(dataRef("mac", "mac-frame", 0, mac.bytes.length), "copied"),
      edge(dataRef("encode66", "64b66b", 0, blocks66.length * 66), "encoded", [dataRef("mac", "mac-frame", 0, mac.bytes.length)]),
      edge(dataRef("transcode257", "257b", 0, preScramble.length), "encoded", [dataRef("encode66", "64b66b", 0, blocks66.length * 66)]),
      edge(dataRef("scramble", "scrambled", 0, scrambled.bits.length), "depends-on", [dataRef("transcode257", "257b", 0, preScramble.length)]),
      edge(dataRef("markers", "tx-scrambled-am", 0, marked.bits.length), "inserted", [dataRef("scramble", "scrambled", 0, scrambled.bits.length)]),
      edge(dataRef("fec", "pcs-symbols", 0, pcsSymbols.length * pcsSymbols[0].length), "encoded", [dataRef("markers", "tx-scrambled-am", 0, marked.bits.length)]),
      edge(dataRef("pcs-lanes", "pcs-lanes", 0, pcsBits.length * pcsBits[0].length), "copied", [dataRef("fec", "pcs-symbols", 0, pcsSymbols.length * pcsSymbols[0].length)]),
      edge(dataRef("physical-lanes", "pmd-lanes", 0, pma.lanes.length * pma.lanes[0].length), "copied", [dataRef("pcs-lanes", "pcs-lanes", 0, pcsBits.length * pcsBits[0].length)]),
      edge(dataRef("pam4", "pam4-levels", 0, pam4.reduce((sum, lane) => sum + lane.normalizedLevels.length, 0)), "encoded", [dataRef("physical-lanes", "pmd-lanes", 0, pma.lanes.length * pma.lanes[0].length)]),
    ];
    return { ok: true, value: Object.freeze({
      id: "experimental-reference-run-v1", profileId: input.profileId, stream: Object.freeze({ ...input.stream }), mac,
      snapshots: Object.freeze(snapshots), trace: Object.freeze(trace), codedBits: estimated.value.codedBits,
      deletions: prepared.deletions,
      txScrambledAmBits: Object.freeze([...marked.bits]),
      scramblerState: Object.freeze([...scrambled.state]),
      markerState: Object.freeze([...marked.state]),
      fecMessages: Object.freeze(fecMessages),
      codewords: Object.freeze(codewords),
      provenance: Object.freeze({ labels: LABELS, rateMatchPolicyId: input.rateMatchPolicy.id, pmaMappingProfileId: input.pmaMappingProfile.id }),
    }) };
  } catch (error) {
    return runError(error instanceof Error ? error.message : "Unable to construct experimental inspector run.");
  }
}
