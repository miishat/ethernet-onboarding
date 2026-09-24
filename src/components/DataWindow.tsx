import { useState } from "react";
import type { Snapshot } from "../inspector/types";

const WINDOW = 64;
export default function DataWindow({ snapshot, onSelect }: { snapshot: Snapshot; onSelect?: (index: number) => void }) {
  const [start, setStart] = useState(0);
  const values = snapshot.buffers[0]?.values || [];
  const safeStart = Math.min(start, Math.max(0, values.length - 1));
  const end = Math.min(values.length, safeStart + WINDOW);
  return <section className="data-window" aria-label={`${snapshot.stage} values`}>
    <div className="inspector-section-head"><span>Showing {values.length ? `${safeStart + 1}–${end}` : "0"} of {values.length} {snapshot.unit}s</span><div className="data-window__controls"><button type="button" onClick={() => setStart(Math.max(0, safeStart - WINDOW))} disabled={safeStart === 0}>Previous</button><button type="button" onClick={() => setStart(Math.min(Math.max(0, values.length - 1), safeStart + WINDOW))} disabled={end === values.length}>Next</button></div></div>
    <div className="data-window__values">{values.slice(safeStart, end).map((value, offset) => <button className="data-window__value" type="button" key={safeStart + offset} onClick={() => onSelect?.(safeStart + offset)} title={`Absolute ${snapshot.unit} ${safeStart + offset}`}><small>{safeStart + offset}</small><code>{snapshot.unit === "bit" ? value : String(value)}</code></button>)}</div>
  </section>;
}
