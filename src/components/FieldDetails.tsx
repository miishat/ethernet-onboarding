import type { FrameField, MacFrame } from "../inspector/types";

const descriptions: Record<string, string> = {
  destination: "Destination MAC address, 6 octets.", source: "Source MAC address, 6 octets.", etherType: "EtherType, 2 octets.",
  payload: "Payload bytes supplied in the editor.", pad: "Padding added to meet the minimum Ethernet frame size.", fcs: "Frame check sequence, 4 octets. Ethernet transmits the CRC-32 least-significant octet first.",
};

export default function FieldDetails({ field, mac }: { field: FrameField; mac: MacFrame }) {
  const bytes = mac.bytes.slice(field.offset, field.offset + field.length);
  return <section className="field-details" aria-label="Field details" aria-live="polite"><p className="inspector-eyebrow">Selected field</p><h2>{field.id === "etherType" ? "EtherType" : field.id === "fcs" ? "FCS" : field.id[0].toUpperCase() + field.id.slice(1)}</h2><p>{descriptions[field.id]}</p><code>{Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(" ")}</code><p>{field.length} byte{field.length === 1 ? "" : "s"}, offsets {field.offset} through {field.offset + field.length - 1}.</p></section>;
}
