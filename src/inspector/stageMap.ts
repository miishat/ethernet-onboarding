import type { InspectorStage } from "./types";
import { stagesFor } from "../data/stepper";
import type { UrlNavigationState } from "../navigation/urlState";

const WALKTHROUGH_STAGE_MAP: Record<string, InspectorStage> = {
  frame: "mac",
  encode: "encode66",
  transcode: "transcode257",
  scramble: "scramble",
  am: "markers",
  fec: "fec",
  stripe: "pcs-lanes",
  serialise: "physical-lanes",
  pam4: "pam4",
  "rx-pam4": "pam4",
  "rx-serialise": "physical-lanes",
  "rx-align": "pcs-lanes",
  "rx-fec": "fec",
  "rx-am": "markers",
  "rx-descramble": "scramble",
  "rx-transcode": "transcode257",
  "rx-decode": "encode66",
  "rx-frame": "mac",
};

export function stageForWalkthrough(id: string): InspectorStage {
  return WALKTHROUGH_STAGE_MAP[id] || "mac";
}

export function openInspector(state: UrlNavigationState): UrlNavigationState {
  const stage = stagesFor(state.dir)[state.stepIndex];
  return {
    ...state,
    view: "inspector",
    inspectorStage: stageForWalkthrough(stage?.id || ""),
    inspectorReturn: state.view === "frame" ? "frame" : "stack",
  };
}

export function closeInspector(state: UrlNavigationState): UrlNavigationState {
  return {
    ...state,
    view: state.inspectorReturn,
    inspectorStage: "mac",
    inspectorReturn: "stack",
  };
}
