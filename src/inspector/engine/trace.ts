import type { DataRef, InspectorStage, Snapshot, TraceEdge } from "../types";

export function dataRef(stage: InspectorStage, bufferId: string, start: number, count: number): DataRef {
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(count) || start < 0 || count < 0) {
    throw new RangeError("Trace references require nonnegative safe half-open spans.");
  }
  return Object.freeze({ stage, bufferId, start, count });
}

export function edge(output: DataRef, relation: TraceEdge["relation"], inputs: readonly DataRef[] = []): TraceEdge {
  return Object.freeze({ output, relation, inputs: Object.freeze([...inputs]) });
}

export function snapshot(
  stage: InspectorStage,
  unit: Snapshot["unit"],
  id: string,
  values: Uint8Array | Uint16Array,
  explanation: string,
  referenceIds: readonly string[],
): Snapshot {
  const output = dataRef(stage, id, 0, values.length);
  return Object.freeze({
    stage,
    unit,
    buffers: Object.freeze([{ id, values: values.slice() }]),
    inputRefs: Object.freeze([]),
    outputRefs: Object.freeze([output]),
    explanation,
    referenceIds: Object.freeze([...referenceIds]),
  });
}
