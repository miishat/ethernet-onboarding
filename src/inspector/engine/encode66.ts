import { octetsToBits } from "./bits";
import { EXPERIMENTAL_PCS_PROVENANCE, type InterfaceWord } from "./stream";
import type { Result } from "../types";

export interface Block66 {
  index: number;
  bits: Uint8Array;
  header: Uint8Array;
  blockType?: number;
  provenance: typeof EXPERIMENTAL_PCS_PROVENANCE;
}

const IDLE = 0x07;
const START = 0xfb;
const TERMINATE = 0xfd;
const TERMINATE_TYPES = [0x87, 0x99, 0xaa, 0xb4, 0xcc, 0xd2, 0xe1, 0xff] as const;

function sevenBits(value: number): Uint8Array {
  return Uint8Array.from({ length: 7 }, (_, bit) => (value >>> bit) & 1);
}

function controlBlock(index: number, type: number, payload: Uint8Array): Result<Block66> {
  const typeBits = octetsToBits(Uint8Array.of(type));
  const bits = new Uint8Array(66);
  bits.set(Uint8Array.of(1, 0));
  bits.set(typeBits, 2);
  bits.set(payload, 10);
  return { ok: true, value: { index, bits, header: Uint8Array.of(1, 0), blockType: type, provenance: EXPERIMENTAL_PCS_PROVENANCE } };
}

export function encode66Block(word: InterfaceWord): Result<Block66> {
  if (word.octets.length !== 8) return { ok: false, errors: { run: "A CDMII word must contain eight octets." } };
  if (word.controlMask === 0) {
    const bits = new Uint8Array(66);
    bits.set(Uint8Array.of(0, 1));
    bits.set(octetsToBits(word.octets), 2);
    return { ok: true, value: { index: word.index, bits, header: Uint8Array.of(0, 1), provenance: EXPERIMENTAL_PCS_PROVENANCE } };
  }
  if (word.controlMask === 0xff && word.octets.every((octet) => octet === IDLE)) {
    const payload = new Uint8Array(56);
    for (let i = 0; i < 8; i += 1) payload.set(sevenBits(0), i * 7);
    return controlBlock(word.index, 0x1e, payload);
  }
  if (word.controlMask === 1 && word.octets[0] === START) {
    return controlBlock(word.index, 0x78, octetsToBits(word.octets.slice(1)));
  }
  const terminateAt = word.octets.indexOf(TERMINATE);
  if (terminateAt >= 0 && word.controlMask === ((0xff << terminateAt) & 0xff) && word.octets.slice(terminateAt + 1).every((octet) => octet === IDLE)) {
    const payload = new Uint8Array(56);
    if (terminateAt > 0) payload.set(octetsToBits(word.octets.slice(0, terminateAt)));
    for (let i = terminateAt + 1; i < 8; i += 1) payload.set(sevenBits(0), terminateAt * 8 + (i - terminateAt - 1) * 7);
    return controlBlock(word.index, TERMINATE_TYPES[terminateAt], payload);
  }
  return { ok: false, errors: { run: "Unsupported experimental reference control placement." } };
}
