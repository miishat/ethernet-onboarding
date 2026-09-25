import type { CompleteInspectorRun, DataRef, InspectorStage } from "../inspector/types";
import DataWindow from "./DataWindow";
import LaneView from "./LaneView";
import Pam4View from "./Pam4View";

function overlaps(a: DataRef, b: DataRef) { return a.stage === b.stage && a.bufferId === b.bufferId && a.start < b.start + b.count && b.start < a.start + a.count; }
function connectedTrace(trace: readonly import("../inspector/types").TraceEdge[], selected: DataRef) {
  const refs: DataRef[] = [selected];
  const edges: typeof trace[number][] = [];
  for (let cursor = 0; cursor < refs.length; cursor += 1) {
    for (const item of trace) {
      if (edges.includes(item) || !(overlaps(item.output, refs[cursor]) || item.inputs.some((input) => overlaps(input, refs[cursor])))) continue;
      edges.push(item);
      if (item.precision === "exact") refs.push(item.output, ...item.inputs);
    }
  }
  return { edges, refs };
}
export default function StageWorkspace({ run, stage, selected, onSelect }: { run: CompleteInspectorRun; stage: InspectorStage; selected?: DataRef | null; onSelect?: (ref: DataRef) => void }) {
  const snapshot = run.snapshots.find((item) => item.stage === stage);
  if (!snapshot) return <section className="inspector__unavailable" aria-label="Unavailable calculation"><h2>{stage}</h2><p>No applied calculation contains this stage.</p></section>;
  const reference = stage === "physical-lanes" || stage === "pam4";
  const trace = selected ? connectedTrace(run.trace, selected) : { edges: [], refs: [] as DataRef[] };
  const connected = trace.edges;
  const linked = selected ? [selected, ...trace.refs] : [];
  const content = stage === "pcs-lanes" ? <LaneView run={run} selected={selected} linked={linked} onSelect={onSelect} /> : stage === "physical-lanes" ? <LaneView run={run} physical selected={selected} linked={linked} onSelect={onSelect} /> : stage === "pam4" ? <Pam4View run={run} selected={selected} linked={linked} onSelect={onSelect} /> : <DataWindow snapshot={snapshot} selected={selected} linked={linked} onSelect={onSelect} />;
  const fcs = run.mac.fcs.map((byte) => byte.toString(16).padStart(2, "0")).join(" ");
  return <section className="stage-workspace" aria-label={`${stage === "pcs-lanes" ? "PCS lanes" : stage.replace(/-/g, " ")} workspace`}><div className="inspector-section-head"><div><p className="inspector-eyebrow">{reference ? "experimental reference PMA mapping" : "experimental candidate PCS calculation"}</p><h2>{stage.replace(/-/g, " ")}</h2></div><span>{snapshot.explanation}</span></div><p className="stage-workspace__applied-input">Applied worker result FCS: <code>{fcs}</code></p><div className="provenance">{run.provenance.labels.map((label) => <span key={label}>{label}</span>)} {snapshot.referenceIds.map((id) => <code key={id}>{id}</code>)}</div>{selected ? <p className="trace-details" aria-live="polite">Selected {selected.stage} {selected.bufferId} at absolute index {selected.start}. {connected.length ? `Trace: ${connected.map((edge) => `${edge.relation} (${edge.precision})`).join(", ")}.` : "No connected trace edge."}</p> : null}{content}</section>;
}
