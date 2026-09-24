import type { CompleteInspectorRun, DataRef, InspectorStage } from "../inspector/types";
import DataWindow from "./DataWindow";
import LaneView from "./LaneView";
import Pam4View from "./Pam4View";

function overlaps(a: DataRef, b: DataRef) { return a.stage === b.stage && a.bufferId === b.bufferId && a.start < b.start + b.count && b.start < a.start + a.count; }
export default function StageWorkspace({ run, stage, selected, onSelect }: { run: CompleteInspectorRun; stage: InspectorStage; selected?: DataRef | null; onSelect?: (ref: DataRef) => void }) {
  const snapshot = run.snapshots.find((item) => item.stage === stage);
  if (!snapshot) return <section className="inspector__unavailable" aria-label="Unavailable calculation"><h2>{stage}</h2><p>No applied calculation contains this stage.</p></section>;
  const reference = stage === "physical-lanes" || stage === "pam4";
  const connected = selected ? run.trace.filter((edge) => overlaps(edge.output, selected) || edge.inputs.some((input) => overlaps(input, selected))) : [];
  const content = stage === "pcs-lanes" ? <LaneView run={run} selected={selected} onSelect={onSelect} /> : stage === "physical-lanes" ? <LaneView run={run} physical selected={selected} onSelect={onSelect} /> : stage === "pam4" ? <Pam4View run={run} selected={selected} onSelect={onSelect} /> : <DataWindow snapshot={snapshot} selected={selected} onSelect={onSelect} />;
  return <section className="stage-workspace" aria-label={`${stage === "pcs-lanes" ? "PCS lanes" : stage.replace(/-/g, " ")} workspace`}><div className="inspector-section-head"><div><p className="inspector-eyebrow">{reference ? "reference PMA mapping" : "IEEE-derived PCS candidate"}</p><h2>{stage.replace(/-/g, " ")}</h2></div><span>{snapshot.explanation}</span></div><div className="provenance">{run.provenance.labels.map((label) => <span key={label}>{label}</span>)} {snapshot.referenceIds.map((id) => <code key={id}>{id}</code>)}</div>{selected ? <p className="trace-details" aria-live="polite">Selected {selected.stage} {selected.bufferId} at absolute index {selected.start}. {connected.length ? `Trace: ${connected.map((edge) => edge.relation).join(", ")}.` : "No connected trace edge."}</p> : null}{content}</section>;
}
