import { describe, expect, it } from "vitest";
import { DEFAULT_FRAME } from "../src/inspector/defaults";
import { crc32 } from "../src/inspector/engine/crc32";
import { buildMacFrame } from "../src/inspector/engine/mac";
import { parseFrame } from "../src/inspector/engine/validation";
import defaultFrameFixture from "./fixtures/inspector/mac-default-frame.json";
import emptyPayloadFixture from "./fixtures/inspector/mac-empty-payload.json";

function asBytes(hex: string): Uint8Array {
  return Uint8Array.from(hex.match(/../g) ?? [], (octet) => Number.parseInt(octet, 16));
}

describe("MAC frame input validation", () => {
  it("accepts the default frame and normalizes whitespace-separated payload hex", () => {
    const parsed = parseFrame({ ...DEFAULT_FRAME, payloadHex: "00 01\n02\t03" });
    expect(parsed).toEqual({
      ok: true,
      value: {
        destination: asBytes("020000000002"),
        source: asBytes("020000000001"),
        etherType: 0x88b5,
        payload: asBytes("00010203"),
      },
    });
  });

  it.each([
    ["destination", { destination: "02-00-00-00-00-02" }],
    ["source", { source: "01:00:00:00:00:01" }],
    ["etherType", { etherType: "05FF" }],
    ["payloadHex", { payloadHex: "0" }],
    ["payloadHex", { payloadHex: "GG" }],
    ["payloadHex", { payloadHex: "00".repeat(1501) }],
  ])("returns a field-specific error for invalid %s", (field, change) => {
    const parsed = parseFrame({ ...DEFAULT_FRAME, ...change });
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.errors[field]).toEqual(expect.any(String));
  });
});

describe("Ethernet CRC-32", () => {
  it("matches the canonical CRC-32 check value", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });

  it("changes when one protected octet changes", () => {
    expect(crc32(asBytes("00010203"))).not.toBe(crc32(asBytes("00010204")));
  });
});

describe("MAC frame construction", () => {
  it("matches the independently frozen default frame bytes and field offsets", () => {
    const parsed = parseFrame(DEFAULT_FRAME);
    if (!parsed.ok) throw new Error("Default input must parse");
    const frame = buildMacFrame(parsed.value);
    expect(frame.bytes).toEqual(asBytes(defaultFrameFixture.frameHex));
    expect(frame.withoutFcs).toEqual(asBytes(defaultFrameFixture.withoutFcsHex));
    expect(frame.fcs).toEqual(asBytes(defaultFrameFixture.fcsHex));
    expect(frame.paddingBytes).toBe(0);
    expect(frame.fields).toEqual([
      { id: "destination", offset: 0, length: 6 },
      { id: "source", offset: 6, length: 6 },
      { id: "etherType", offset: 12, length: 2 },
      { id: "payload", offset: 14, length: 64 },
      { id: "fcs", offset: 78, length: 4 },
    ]);
  });

  it("zero-pads an empty payload to the minimum payload length and writes FCS little-endian", () => {
    const parsed = parseFrame({ ...DEFAULT_FRAME, payloadHex: "" });
    if (!parsed.ok) throw new Error("Empty payload must parse");
    const frame = buildMacFrame(parsed.value);
    expect(frame.bytes).toEqual(asBytes(emptyPayloadFixture.frameHex));
    expect(frame.bytes.length).toBe(64);
    expect(frame.paddingBytes).toBe(46);
    expect(frame.fields).toEqual([
      { id: "destination", offset: 0, length: 6 },
      { id: "source", offset: 6, length: 6 },
      { id: "etherType", offset: 12, length: 2 },
      { id: "payload", offset: 14, length: 0 },
      { id: "pad", offset: 14, length: 46 },
      { id: "fcs", offset: 60, length: 4 },
    ]);
    expect(frame.fcs).toEqual(asBytes("5D7BF4CB"));
  });

  it("keeps a 1500-byte payload unpadded", () => {
    const parsed = parseFrame({ ...DEFAULT_FRAME, payloadHex: "AB".repeat(1500) });
    if (!parsed.ok) throw new Error("Maximum payload must parse");
    const frame = buildMacFrame(parsed.value);
    expect(frame.paddingBytes).toBe(0);
    expect(frame.bytes).toHaveLength(1518);
    expect(frame.fields.find((field) => field.id === "pad")).toBeUndefined();
  });
});
