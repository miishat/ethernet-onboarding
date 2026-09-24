export type InspectorStage = "mac" | "encode66" | "transcode257" |
  "scramble" | "markers" | "fec" | "pcs-lanes" | "physical-lanes" | "pam4";

export type ProfileId =
  | "400gbase-dr4-tx-v1"
  | "400gbase-r-tx-v1"
  | "400gbase-dr4-tx-reference-pma-v1";

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

/** A named stage declaration. It is not evidence that its calculation exists. */
export interface CalculationContract {
  id: ProfileId;
  label: string;
  provenance: "ieee-verified" | "reference-mapping";
  declaredStages: readonly InspectorStage[];
  executionStatus: "declared-contract-only" | "implemented";
  reason: string;
  referenceIds: readonly string[];
}

export interface StageSupport {
  supported: boolean;
  provenance: "ieee-verified" | "reference-mapping" | "blocked";
  reason: string;
  missingRuleIds: readonly string[];
}

export interface RateMatchDeletion {
  originalWordIndex: number;
  originalOctetOffset: number;
  originalBitOffset: number;
  idleOctets: readonly number[];
  controlMask: number;
  policyId: string;
  reason: "alignment-marker-reservation" | "trailing-fec-completion";
  reservation: {
    groupIndex: number;
    insertionBitOffset: number;
    fecPairIndex: number;
    boundaryKind: "am-group" | "run-completion";
  };
}

export interface RateMatchPolicy {
  id: string;
  source: "project-owned";
  eligibleIdleControlCodes: readonly number[];
  selection: "earliest-eligible-before-reservation";
  tieBreak: "lowest-absolute-word-index";
  maximumDeferralBlocks: number;
  frameBoundaryRule: "never-remove-frame-data";
  amSchedule: {
    unit: "transcoded-257b-block";
    cadenceBlocks: number;
    reservationBlocks: number;
    fecPairBlocks: number;
    phaseZeroAbsoluteStreamBlock: 0;
  };
}

export interface PmaMappingProfile {
  id: "reference-16x4-bit-mux-v1";
  kind: "implementation-specific-reference";
  sourceRevision: string;
  fixtureId: string;
  periodBits: 4;
  sourcePcsLaneByPmdLane: readonly [
    readonly [0, 1, 2, 3],
    readonly [4, 5, 6, 7],
    readonly [8, 9, 10, 11],
    readonly [12, 13, 14, 15],
  ];
  initialPhase: 0;
  firstBitSignificance: "msb";
  grayLevels: Readonly<Record<"00" | "01" | "11" | "10", -3 | -1 | 1 | 3>>;
  precoder: { mode: "none" };
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
  buffers: readonly { id: string; values: readonly number[] }[];
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

export interface RunSize {
  interfaceWords: number;
  transcodedBlocks: number;
  markerGroups: number;
  fecPairCount: number;
  codedBits: number;
}

export interface RunInput {
  frame: FrameInput;
  stream: StreamConfig;
  profileId: "400gbase-dr4-tx-reference-pma-v1";
  rateMatchPolicy: RateMatchPolicy;
  pmaMappingProfile: PmaMappingProfile;
}

export interface ExperimentalProvenance {
  labels: readonly [
    "Experimental reference using candidate contracts",
    "Candidate IEEE source",
    "Independent local fixture",
    "Not IEEE verified or standards conformant",
  ];
  rateMatchPolicyId: string;
  pmaMappingProfileId: PmaMappingProfile["id"];
}

export interface PublicMacFrame {
  readonly bytes: readonly number[];
  readonly withoutFcs: readonly number[];
  readonly fcs: readonly number[];
  readonly fields: readonly FrameField[];
  readonly paddingBytes: number;
}

/** Public, immutable lane views retained alongside flattened snapshots for UI inspection. */
export interface LaneInspectionData {
  readonly pcsSymbols: readonly (readonly number[])[];
  readonly physicalBits: readonly (readonly number[])[];
  readonly physicalSourcePcsLane: readonly (readonly number[])[];
  readonly physicalStartAbsoluteBit: number;
  readonly pam4: readonly (readonly { readonly dibit: "00" | "01" | "11" | "10"; readonly normalizedLevel: -3 | -1 | 1 | 3 }[])[];
}

export interface CompleteInspectorRun extends Omit<InspectorRun, "mac"> {
  readonly mac: PublicMacFrame;
  readonly codedBits: number;
  readonly deletions: readonly RateMatchDeletion[];
  /** Immutable public copies. Internal engines retain typed arrays while composing. */
  readonly txScrambledAmBits: readonly number[];
  readonly scramblerState: readonly number[];
  readonly markerState: readonly number[];
  /** Per complete FEC pair, ordered A then B. */
  readonly fecMessages: readonly (readonly [readonly number[], readonly number[]])[];
  /** Per complete FEC pair, ordered A then B. */
  readonly codewords: readonly (readonly [readonly number[], readonly number[]])[];
  readonly provenance: ExperimentalProvenance;
  readonly laneInspection: LaneInspectionData;
}
