import type { Snapshot } from "../inspector/types";
import DataWindow from "./DataWindow";
export default function LaneView({ snapshot, physical = false }: { snapshot: Snapshot; physical?: boolean }) {
  return <section className="lane-view" aria-label={physical ? "Physical lane values" : "PCS lane values"}><p>{physical ? "Reference PMA mapping. Values include the selected source PCS lane and mux phase." : "PCS lane output. Symbols serialize bit zero first."}</p><DataWindow snapshot={snapshot} /></section>;
}
