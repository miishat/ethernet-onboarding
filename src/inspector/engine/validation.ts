import type { FrameDraft, FrameInput, Result } from "../types";

const MAC_ADDRESS = /^(?:[0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;
const ETHER_TYPE = /^[0-9A-Fa-f]{4}$/;
const PAYLOAD_HEX = /^[0-9A-Fa-f]*$/;

function parseMac(value: string): Uint8Array | undefined {
  if (!MAC_ADDRESS.test(value)) return undefined;
  return Uint8Array.from(value.split(":"), (octet) => Number.parseInt(octet, 16));
}

export function parseFrame(draft: FrameDraft): Result<FrameInput> {
  const errors: Partial<Record<keyof FrameDraft, string>> = {};
  const destination = parseMac(draft.destination);
  const source = parseMac(draft.source);
  const payloadText = draft.payloadHex.replace(/\s/g, "");

  if (!destination) errors.destination = "Use six two-digit hexadecimal octets separated by colons.";
  if (!source) {
    errors.source = "Use six two-digit hexadecimal octets separated by colons.";
  } else if ((source[0] & 1) !== 0) {
    errors.source = "Source address must be an individual (unicast) address.";
  }

  const etherType = Number.parseInt(draft.etherType, 16);
  if (!ETHER_TYPE.test(draft.etherType) || etherType < 0x0600) {
    errors.etherType = "Use a four-digit EtherType from 0600 through FFFF.";
  }

  if (!PAYLOAD_HEX.test(payloadText) || payloadText.length % 2 !== 0) {
    errors.payloadHex = "Use whole hexadecimal octets, optionally separated by whitespace.";
  } else if (payloadText.length / 2 > 1500) {
    errors.payloadHex = "Payload must be at most 1500 octets.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      destination: destination!,
      source: source!,
      etherType,
      payload: Uint8Array.from(payloadText.match(/../g) ?? [], (octet) => Number.parseInt(octet, 16)),
    },
  };
}
