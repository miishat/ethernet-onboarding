import type { Result } from "../types";
import { EXPERIMENTAL_PCS_PROVENANCE } from "./stream";
import type { Block66 } from "./encode66";

export interface Block257 {
  index: number;
  bits: Uint8Array;
  sourceBlockIds: readonly [number, number, number, number];
  provenance: typeof EXPERIMENTAL_PCS_PROVENANCE;
}

export function transcode257Group(blocks: readonly [Block66, Block66, Block66, Block66]): Result<Block257> {
  if (blocks.some((block) => block.bits.length !== 66)) return { ok: false, errors: { run: "A transcoder group requires four 66-bit blocks." } };
  const payload = new Uint8Array(256);
  for (let j = 0; j < 4; j += 1) payload.set(blocks[j].bits.slice(2), j * 64);
  const allData = blocks.every((block) => block.bits[0] === 0 && block.bits[1] === 1);
  const bits = new Uint8Array(257);
  if (allData) {
    bits[0] = 1;
    bits.set(payload, 1);
  } else if (blocks.every((block) => block.bits[0] !== block.bits[1])) {
    bits[0] = 0;
    for (let j = 0; j < 4; j += 1) bits[j + 1] = blocks[j].bits[1];
    const firstControl = blocks.findIndex((block) => block.bits[0] === 1);
    const compressed = Uint8Array.from([...payload.slice(0, firstControl * 64 + 4), ...payload.slice(firstControl * 64 + 8)]);
    bits.set(compressed, 5);
  } else {
    return { ok: false, errors: { run: "Invalid synchronization header in experimental transcoder input." } };
  }
  return { ok: true, value: { index: Math.floor(blocks[0].index / 4), bits, sourceBlockIds: [blocks[0].index, blocks[1].index, blocks[2].index, blocks[3].index], provenance: EXPERIMENTAL_PCS_PROVENANCE } };
}
