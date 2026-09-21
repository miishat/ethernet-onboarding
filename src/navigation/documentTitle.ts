import { stagesFor } from "../data/stepper";
import { nodeAt } from "../data/tree";
import type { UrlNavigationState } from "./urlState";

export const PRODUCT_NAME = "Ethernet PHY Onboarding";

/** Build a stable, concise title for the current learning location. */
export function documentTitle(state: UrlNavigationState): string {
  if (state.view === "inspector") {
    return `${PRODUCT_NAME} | Frame inspector: ${inspectorTitle(state.inspectorStage)}`;
  }

  if (state.view === "frame") {
    const stages = stagesFor(state.dir);
    const rawIndex = Number.isFinite(state.stepIndex) ? Math.floor(state.stepIndex) : 0;
    const index = Math.min(stages.length - 1, Math.max(0, rawIndex));
    const stage = stages[index];
    return stage
      ? `${PRODUCT_NAME} | Frame ${index + 1}: ${stage.title}`
      : `${PRODUCT_NAME} | Frame ${index + 1}`;
  }

  const node = nodeAt(Array.isArray(state.path) ? state.path : []);
  return node ? `${PRODUCT_NAME} | ${node.name}` : PRODUCT_NAME;
}

function inspectorTitle(stage: UrlNavigationState["inspectorStage"]): string {
  const titles: Record<UrlNavigationState["inspectorStage"], string> = {
    mac: "MAC", encode66: "64b/66b", transcode257: "256b/257b", scramble: "Scrambler",
    markers: "Alignment markers", fec: "FEC", "pcs-lanes": "PCS lanes",
    "physical-lanes": "Physical lanes", pam4: "PAM4",
  };
  return titles[stage];
}
