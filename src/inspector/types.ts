export type InspectorStage = "mac" | "encode66" | "transcode257" |
  "scramble" | "markers" | "fec" | "pcs-lanes" | "physical-lanes" | "pam4";

export type ProfileId = "400gbase-dr4-tx-v1";

export interface FrameDraft {
  destination: string;
  source: string;
  etherType: string;
  payloadHex: string;
}

export interface FrameInput {
  destination: Uint8Array;
  source: Uint8Array;
  etherType: number;
  payload: Uint8Array;
}

export type Result<T> = { ok: true; value: T } |
  { ok: false; errors: Partial<Record<keyof FrameDraft | "profile" | "run", string>> };

export interface StreamConfig {
  scramblerSeedHex: string;
  markerPrbsSeed: number;
  markerBlockPhase: number;
  lanePhase: number;
  prefixIdleOctets: number;
}

/** Describes an intended profile; use the capability gate before computation. */
export interface Profile {
  id: ProfileId;
  label: string;
  standardEdition: string;
  referenceIds: readonly string[];
  pcsLaneCount: number;
  physicalLaneCount: number;
  baudGBd: number;
}

export interface FrameField {
  id: string;
  offset: number;
  length: number;
}

export interface MacFrame {
  bytes: Uint8Array;
  withoutFcs: Uint8Array;
  fcs: Uint8Array;
  fields: readonly FrameField[];
  paddingBytes: number;
}

/** A half-open span [start, start + count), in the referenced buffer's units. */
export interface DataRef {
  stage: InspectorStage;
  bufferId: string;
  start: number;
  count: number;
}

export interface TraceEdge {
  output: DataRef;
  inputs: readonly DataRef[];
  relation: "copied" | "encoded" | "depends-on" | "inserted";
}

export interface Snapshot {
  stage: InspectorStage;
  unit: "octet" | "bit" | "rs-symbol" | "pam4-symbol";
  buffers: readonly { id: string; values: Uint8Array | Uint16Array }[];
  inputRefs: readonly DataRef[];
  outputRefs: readonly DataRef[];
  explanation: string;
  referenceIds: readonly string[];
}

export interface InspectorRun {
  id: string;
  profileId: ProfileId;
  stream: StreamConfig;
  mac: MacFrame;
  snapshots: readonly Snapshot[];
  trace: readonly TraceEdge[];
}
