import type { MacFrame, Result } from "../types";

export const EXPERIMENTAL_PCS_PROVENANCE = Object.freeze({
  profileId: "400gbase-dr4-tx-reference-pma-v1",
  status: "experimental-candidate",
  sourceId: "ieee-bs-d14-cl119-locator",
  controlPolicyId: "product-owned-cdmii-controls-v1",
  label: "Experimental reference using candidate contracts",
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
