import { crc32 } from "./crc32";
import type { FrameField, FrameInput, MacFrame } from "../types";

const MINIMUM_PAYLOAD_BYTES = 46;

export function buildMacFrame(input: FrameInput): MacFrame {
  const paddingBytes = Math.max(0, MINIMUM_PAYLOAD_BYTES - input.payload.length);
  const withoutFcs = new Uint8Array(14 + input.payload.length + paddingBytes);
  withoutFcs.set(input.destination, 0);
  withoutFcs.set(input.source, 6);
  withoutFcs[12] = input.etherType >>> 8;
  withoutFcs[13] = input.etherType & 0xff;
  withoutFcs.set(input.payload, 14);

  const crc = crc32(withoutFcs);
  const fcs = Uint8Array.of(crc & 0xff, (crc >>> 8) & 0xff, (crc >>> 16) & 0xff, (crc >>> 24) & 0xff);
  const bytes = new Uint8Array(withoutFcs.length + fcs.length);
  bytes.set(withoutFcs);
  bytes.set(fcs, withoutFcs.length);

  const fields: FrameField[] = [
    { id: "destination", offset: 0, length: 6 },
    { id: "source", offset: 6, length: 6 },
    { id: "etherType", offset: 12, length: 2 },
  ];
  fields.push({ id: "payload", offset: 14, length: input.payload.length });
  if (paddingBytes > 0) fields.push({ id: "pad", offset: 14 + input.payload.length, length: paddingBytes });
  fields.push({ id: "fcs", offset: withoutFcs.length, length: fcs.length });

  return { bytes, withoutFcs, fcs, fields, paddingBytes };
}
