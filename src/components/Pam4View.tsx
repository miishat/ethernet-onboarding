import type { Snapshot } from "../inspector/types";
import DataWindow from "./DataWindow";
export default function Pam4View({ snapshot }: { snapshot: Snapshot }) { return <section className="pam4-view" aria-label="PAM4 values"><p>Reference PMA mapping. Values are normalized PAM4 levels, not measured voltage or optical power.</p><DataWindow snapshot={snapshot} /></section>; }
