import type { CompleteInspectorRun, InspectorStage } from "../inspector/types";
import DataWindow from "./DataWindow";
import LaneView from "./LaneView";
import Pam4View from "./Pam4View";

export default function StageWorkspace({ run, stage }: { run: CompleteInspectorRun; stage: InspectorStage }) {
  const snapshot = run.snapshots.find((item) => item.stage === stage);
  if (!snapshot) return <section className="inspector__unavailable" aria-label="Unavailable calculation"><h2>{stage}</h2><p>No applied calculation contains this stage.</p></section>;
  const reference = stage === "physical-lanes" || stage === "pam4";
  const content = stage === "pcs-lanes" ? <LaneView snapshot={snapshot} /> : stage === "physical-lanes" ? <LaneView snapshot={snapshot} physical /> : stage === "pam4" ? <Pam4View snapshot={snapshot} /> : <DataWindow snapshot={snapshot} />;
  return <section className="stage-workspace" aria-label={`${stage === "pcs-lanes" ? "PCS lanes" : stage.replace(/-/g, " ")} workspace`}><div className="inspector-section-head"><div><p className="inspector-eyebrow">{reference ? "reference PMA mapping" : "IEEE-derived PCS candidate"}</p><h2>{stage.replace(/-/g, " ")}</h2></div><span>{snapshot.explanation}</span></div><div className="provenance">{run.provenance.labels.map((label) => <span key={label}>{label}</span>)} {snapshot.referenceIds.map((id) => <code key={id}>{id}</code>)}</div>{content}</section>;
}
