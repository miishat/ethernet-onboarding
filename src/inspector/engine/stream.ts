import type { MacFrame, RateMatchDeletion, RateMatchPolicy, Result } from "../types";

export const EXPERIMENTAL_PCS_PROVENANCE = Object.freeze({
  profileId: "400gbase-dr4-tx-reference-pma-v1",
  status: "experimental-candidate",
  sourceId: "ieee-bs-d14-cl119-locator",
  controlPolicyId: "product-owned-cdmii-controls-v1",
  label: "Experimental reference using candidate contracts",
  candidateArtifactSha256: "64f58abe7bc197578eebd0a0dc8d4b0d97e4855173b61bce6955e97b5accc1f9",
  candidatePages: Object.freeze([98, 99, 100, 101]),
});

export interface InterfaceWord {
  index: number;
  octets: Uint8Array;
  controlMask: number;
  provenance: typeof EXPERIMENTAL_PCS_PROVENANCE;
}

export interface InterfaceStream {
  words: readonly InterfaceWord[];
  provenance: typeof EXPERIMENTAL_PCS_PROVENANCE;
}

export interface PreparedStream {
  stream: InterfaceStream;
  deletions: readonly RateMatchDeletion[];
  absoluteStreamBlock: number;
  provenance: { source: "project-owned"; policyId: string; status: "experimental-candidate" };
}

/** Copies every mutable nested value before exposing the rate-match ledger. */
export function freezeRateMatchLedger(deletions: readonly RateMatchDeletion[]): readonly RateMatchDeletion[] {
  return Object.freeze(deletions.map((deletion) => Object.freeze({
    ...deletion,
    idleOctets: Object.freeze([...deletion.idleOctets]),
    reservation: Object.freeze({ ...deletion.reservation }),
  })));
}

/**
 * Applies the declared product-owned selection rule before PCS encoding.
 * A reservation deletes whole all-Idle CDMII words only. A partial word or
 * any word containing frame data is deliberately ineligible.
 */
export function prepareStream(input: InterfaceStream, policy: RateMatchPolicy, absoluteStreamBlock: number): Result<PreparedStream> {
  if (!Number.isInteger(absoluteStreamBlock) || absoluteStreamBlock < 0) return { ok: false, errors: { run: "The absolute stream block must be a nonnegative integer." } };
  if (policy.source !== "project-owned" || policy.selection !== "earliest-eligible-before-reservation" || policy.tieBreak !== "lowest-absolute-word-index") return { ok: false, errors: { run: "Only the declared product-owned reference rate-match policy is supported." } };
  const schedule = policy.amSchedule;
  if (![schedule.cadenceBlocks, schedule.reservationBlocks, schedule.fecPairBlocks].every((value) => Number.isInteger(value) && value > 0) || schedule.cadenceBlocks % schedule.fecPairBlocks !== 0) return { ok: false, errors: { run: "Rate-match cadence must use positive FEC-pair-aligned block counts." } };
  // Four 66-bit blocks, each built from one eight-octet CDMII word, form one
  // 257-bit input block. Count exact schedule boundaries in this window.
  const span = Math.ceil(input.words.length / 4);
  const firstAbsolute = Math.max(absoluteStreamBlock, schedule.phaseZeroAbsoluteStreamBlock);
  const lastAbsolute = absoluteStreamBlock + span - 1;
  const firstGroup = Math.ceil((firstAbsolute - schedule.phaseZeroAbsoluteStreamBlock) / schedule.cadenceBlocks);
  const lastGroup = Math.floor((lastAbsolute - schedule.phaseZeroAbsoluteStreamBlock) / schedule.cadenceBlocks);
  const wordsPerReservation = schedule.reservationBlocks * 4;
  const eligible = input.words.filter((word) => word.controlMask === 0xff && word.octets.every((octet) => policy.eligibleIdleControlCodes.includes(octet)));
  if (!Number.isInteger(policy.maximumDeferralBlocks) || policy.maximumDeferralBlocks < 0) return { ok: false, errors: { run: "The product-owned rate-match policy requires a nonnegative maximum deferral." } };
  const selected = new Set<number>();
  const deletions: RateMatchDeletion[] = [];
  for (let groupIndex = firstGroup; groupIndex <= lastGroup; groupIndex += 1) {
    const absoluteReservationBlock = schedule.phaseZeroAbsoluteStreamBlock + groupIndex * schedule.cadenceBlocks;
    const inputBlockIndex = absoluteReservationBlock - absoluteStreamBlock;
    const reservationWordBoundary = inputBlockIndex * 4;
    const beforeBoundary = eligible.filter((word) => !selected.has(word.index) && (inputBlockIndex === 0 || word.index < reservationWordBoundary));
    const chosen = beforeBoundary.length >= wordsPerReservation
      ? beforeBoundary.slice(0, wordsPerReservation)
      : eligible.filter((word) => !selected.has(word.index) && word.index >= reservationWordBoundary && word.index <= reservationWordBoundary + policy.maximumDeferralBlocks * 4).slice(0, wordsPerReservation);
    if (chosen.length < wordsPerReservation) {
      const deferralLimit = reservationWordBoundary + policy.maximumDeferralBlocks * 4;
      const withinDeferral = eligible.filter((word) => !selected.has(word.index) && word.index <= deferralLimit);
      if (withinDeferral.length < wordsPerReservation) return { ok: false, errors: { run: "The product-owned rate-match policy cannot find enough eligible Idle words before its maximum deferral." } };
      return { ok: false, errors: { run: "The product-owned rate-match policy requires eligible Idle words before each marker reservation." } };
    }
    for (const word of chosen) {
      selected.add(word.index);
      deletions.push({ originalWordIndex: word.index, originalOctetOffset: 0, originalBitOffset: 0, idleOctets: Object.freeze([...word.octets]), controlMask: word.controlMask, policyId: policy.id, reason: "alignment-marker-reservation", reservation: { groupIndex, insertionBitOffset: inputBlockIndex * 257, fecPairIndex: Math.floor(absoluteReservationBlock / schedule.fecPairBlocks), boundaryKind: "am-group" } });
    }
  }
  const words = input.words.filter((word) => !selected.has(word.index)).map((word, index) => ({ ...word, index }));
  return { ok: true, value: { stream: { words, provenance: input.provenance }, deletions: freezeRateMatchLedger(deletions), absoluteStreamBlock, provenance: { source: "project-owned", policyId: policy.id, status: "experimental-candidate" } } };
}

const IDLE = 0x07;
const START = 0xfb;
const TERMINATE = 0xfd;

function word(index: number, octets: Uint8Array, controlMask: number): InterfaceWord {
  return { index, octets, controlMask, provenance: EXPERIMENTAL_PCS_PROVENANCE };
}

export function buildInterfaceStream(mac: MacFrame, prefixIdleOctets: number): Result<InterfaceStream> {
  if (!Number.isInteger(prefixIdleOctets) || prefixIdleOctets < 0 || prefixIdleOctets % 8 !== 0) {
    return { ok: false, errors: { run: "The experimental reference prefix must be a multiple of eight Idle octets." } };
  }
  const raw: Array<{ octet: number; control: boolean }> = [];
  for (let i = 0; i < prefixIdleOctets; i += 1) raw.push({ octet: IDLE, control: true });
  raw.push({ octet: START, control: true });
  for (let i = 0; i < 6; i += 1) raw.push({ octet: 0x55, control: false });
  raw.push({ octet: 0xd5, control: false });
  for (const octet of mac.bytes) raw.push({ octet, control: false });
  raw.push({ octet: TERMINATE, control: true });
  while (raw.length % 32 !== 0) raw.push({ octet: IDLE, control: true });

  const words: InterfaceWord[] = [];
  for (let offset = 0; offset < raw.length; offset += 8) {
    const octets = Uint8Array.from(raw.slice(offset, offset + 8), (value) => value.octet);
    const controlMask = raw.slice(offset, offset + 8).reduce((mask, value, bit) => mask | (value.control ? 1 << bit : 0), 0);
    words.push(word(words.length, octets, controlMask));
  }
  return { ok: true, value: { words, provenance: EXPERIMENTAL_PCS_PROVENANCE } };
}
