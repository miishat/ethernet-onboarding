import { describe, expect, it } from "vitest";
import { buildMacFrame } from "../src/inspector/engine/mac";
import { octetsToBits, bitsToOctets, readBits, writeBits } from "../src/inspector/engine/bits";
import { buildInterfaceStream } from "../src/inspector/engine/stream";
import { encode66Block } from "../src/inspector/engine/encode66";
import { transcode257Group } from "../src/inspector/engine/transcode257";
import vectors from "./fixtures/inspector/pcs-d14-reference-v1.json";

const bits = (value: Uint8Array) => Array.from(value).join("");

const mac = buildMacFrame({
  destination: Uint8Array.of(2, 0, 0, 0, 0, 2),
  source: Uint8Array.of(2, 0, 0, 0, 0, 1),
  etherType: 0x88b5,
  payload: Uint8Array.of(0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff, 1, 2, 3, 4),
});

describe("experimental PCS reference serialization", () => {
  it("serializes octets least-significant-bit first under the D1.4 candidate convention", () => {
    expect(octetsToBits(Uint8Array.of(0x81))).toEqual(Uint8Array.of(1, 0, 0, 0, 0, 0, 0, 1));
    expect(bitsToOctets(Uint8Array.of(1, 0, 0, 0, 0, 0, 0, 1))).toEqual(Uint8Array.of(0x81));
  });

  it("rejects non-binary and incomplete octet conversions", () => {
    expect(() => bitsToOctets(Uint8Array.of(0, 1, 2, 0, 1, 0, 1, 0))).toThrow(/binary/i);
    expect(() => bitsToOctets(Uint8Array.of(0, 1))).toThrow(/octet/i);
    expect(() => readBits(Uint8Array.of(0, 1), 1, 2)).toThrow(/range/i);
    expect(() => writeBits(Uint8Array.of(0, 1), 1, Uint8Array.of(2))).toThrow(/binary/i);
  });

  it("forms candidate CDMII words with preamble, SFD, start, termination, and four-word idle completion", () => {
    const stream = buildInterfaceStream(mac, 8);
    expect(stream.ok).toBe(true);
    if (!stream.ok) throw new Error(stream.errors.run);
    expect(stream.value.provenance.profileId).toBe("400gbase-dr4-tx-reference-pma-v1");
    expect(stream.value.words).toHaveLength(12);
    expect(stream.value.words[0]).toMatchObject({ index: 0, controlMask: 0xff, octets: Uint8Array.of(0x07, 0x07, 0x07, 0x07, 0x07, 0x07, 0x07, 0x07) });
    expect(stream.value.words[1]).toMatchObject({ controlMask: 1, octets: Uint8Array.of(0xfb, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0xd5) });
    expect(stream.value.words[10]).toMatchObject({ controlMask: 0xff, octets: Uint8Array.of(0xfd, 0x07, 0x07, 0x07, 0x07, 0x07, 0x07, 0x07) });
    expect(stream.value.words.at(-1)).toMatchObject({ controlMask: 0xff });
  });

  it("rejects a prefix that cannot represent whole CDMII words", () => {
    expect(buildInterfaceStream(mac, 1)).toMatchObject({ ok: false, errors: { run: expect.stringMatching(/multiple of eight/i) } });
  });

  it.each([46, 47, 48, 49, 50, 51, 52, 53])("generates each terminate placement and completes a four-word group for a %i-byte payload", (payloadBytes) => {
    const frame = buildMacFrame({ destination: Uint8Array.of(2, 0, 0, 0, 0, 2), source: Uint8Array.of(2, 0, 0, 0, 0, 1), etherType: 0x88b5, payload: new Uint8Array(payloadBytes) });
    const result = buildInterfaceStream(frame, 8);
    if (!result.ok) throw new Error(result.errors.run);
    const term = result.value.words.find((word) => word.octets.includes(0xfd));
    expect(term?.octets.indexOf(0xfd)).toBe(payloadBytes - 46);
    expect(result.value.words.length % 4).toBe(0);
  });
});

describe("experimental 64B/66B and 256B/257B reference blocks", () => {
  it("encodes all data and candidate idle control blocks with their candidate sync headers and type", () => {
    const data = encode66Block({ index: 4, octets: Uint8Array.of(0, 1, 2, 3, 4, 5, 6, 7), controlMask: 0 });
    const idle = encode66Block({ index: 5, octets: Uint8Array.of(7, 7, 7, 7, 7, 7, 7, 7), controlMask: 0xff });
    expect(data).toMatchObject({ ok: true, value: { index: 4, header: Uint8Array.of(0, 1), bits: expect.any(Uint8Array) } });
    expect(idle).toMatchObject({ ok: true, value: { index: 5, header: Uint8Array.of(1, 0), blockType: 0x1e } });
    if (data.ok) expect(data.value.bits).toHaveLength(66);
    if (idle.ok) expect(idle.value.bits).toHaveLength(66);
  });

  it("rejects an unsupported control placement instead of encoding it as data", () => {
    expect(encode66Block({ index: 0, octets: Uint8Array.of(0xfb, 1, 2, 3, 4, 5, 6, 7), controlMask: 2 })).toMatchObject({ ok: false, errors: { run: expect.stringMatching(/control placement/i) } });
  });

  it("transcodes four data blocks into exactly 257 bits and preserves their IDs", () => {
    const blocks = [0, 1, 2, 3].map((index) => encode66Block({ index, octets: Uint8Array.from({ length: 8 }, (_, bit) => index * 8 + bit), controlMask: 0 }));
    if (blocks.some((block) => !block.ok)) throw new Error("candidate data blocks must encode");
    const group = transcode257Group(blocks.map((block) => (block as { ok: true; value: any }).value) as any);
    expect(group).toMatchObject({ ok: true, value: { index: 0, sourceBlockIds: [0, 1, 2, 3], bits: expect.any(Uint8Array) } });
    if (group.ok) expect(group.value.bits).toHaveLength(257);
  });

  it("matches independent frozen all-data and mixed-control 66b and 257b vectors", () => {
    for (const fixture of [vectors.vectors.allData, vectors.vectors.mixedControl]) {
      const blocks = fixture.inputOctets.map((octets, index) => {
        const block = encode66Block({ index, octets: Uint8Array.from(octets), controlMask: fixture.controlMasks[index] });
        if (!block.ok) throw new Error(block.errors.run);
        expect(bits(block.value.bits)).toBe(fixture.expected66Bits[index]);
        return block.value;
      });
      const group = transcode257Group(blocks as [typeof blocks[0], typeof blocks[1], typeof blocks[2], typeof blocks[3]]);
      if (!group.ok) throw new Error(group.errors.run);
      expect(bits(group.value.bits)).toBe(fixture.expected257Bits);
      expect(group.value.provenance).toMatchObject({ candidateArtifactSha256: vectors.sourceSha256, candidatePages: vectors.sourcePages });
    }
  });
});
