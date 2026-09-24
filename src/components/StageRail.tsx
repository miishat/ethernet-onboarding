import type { InspectorStage, ProfileId } from "../inspector/types";
import { getStageSupport } from "../inspector/profiles";

const stages: readonly { id: InspectorStage; label: string }[] = [
  { id: "mac", label: "MAC frame" }, { id: "encode66", label: "64b/66b" }, { id: "transcode257", label: "256B/257B" },
  { id: "scramble", label: "Scramble" }, { id: "markers", label: "Alignment markers" }, { id: "fec", label: "FEC" },
  { id: "pcs-lanes", label: "PCS lanes" }, { id: "physical-lanes", label: "Physical lanes" }, { id: "pam4", label: "PAM4" },
];

export default function StageRail({ stage, onStageChange, profileId = "400gbase-dr4-tx-reference-pma-v1" }: { stage: InspectorStage; onStageChange: (stage: InspectorStage) => void; profileId?: ProfileId }) {
  return <nav className="stage-rail" aria-label="Frame processing stages">{stages.map((item, index) => <button key={item.id} type="button" aria-pressed={stage === item.id} onClick={() => onStageChange(item.id)}>
    <span>{index + 1}</span>{item.label}{!getStageSupport(profileId, item.id).supported ? <small>Calculation not available yet</small> : null}
  </button>)}</nav>;
}
