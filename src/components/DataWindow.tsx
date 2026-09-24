import { useEffect, useState } from "react";
import type { DataRef, Snapshot } from "../inspector/types";

const WINDOW = 64;
function overlaps(a: DataRef, b: DataRef) { return a.stage === b.stage && a.bufferId === b.bufferId && a.start < b.start + b.count && b.start < a.start + a.count; }
export default function DataWindow({ snapshot, selected, linked = [], onSelect }: { snapshot: Snapshot; selected?: DataRef | null; linked?: readonly DataRef[]; onSelect?: (ref: DataRef) => void }) {
  const [start, setStart] = useState(0);
  const values = snapshot.buffers[0]?.values || [];
  const focus = linked.find((ref) => ref.stage === snapshot.stage && ref.bufferId === snapshot.buffers[0]?.id);
  useEffect(() => { if (focus) setStart(Math.floor(focus.start / WINDOW) * WINDOW); }, [focus?.stage, focus?.bufferId, focus?.start]);
  const safeStart = Math.min(start, Math.max(0, values.length - 1));
  const end = Math.min(values.length, safeStart + WINDOW);
  return <section className="data-window" aria-label={`${snapshot.stage} values`}>
    <div className="inspector-section-head"><span>Showing {values.length ? `${safeStart + 1}–${end}` : "0"} of {values.length} {snapshot.unit}s</span><div className="data-window__controls"><button type="button" onClick={() => setStart(Math.max(0, safeStart - WINDOW))} disabled={safeStart === 0}>Previous</button><button type="button" onClick={() => setStart(Math.min(Math.max(0, values.length - 1), safeStart + WINDOW))} disabled={end === values.length}>Next</button></div></div>
    <div className="data-window__values">{values.slice(safeStart, end).map((value, offset) => { const absolute = safeStart + offset; const ref = { stage: snapshot.stage, bufferId: snapshot.buffers[0].id, start: absolute, count: 1 } as const; const linkedCell = linked.some((item) => overlaps(item, ref)); return <button className="data-window__value" data-linked={linkedCell || undefined} aria-pressed={selected?.stage === ref.stage && selected.bufferId === ref.bufferId && selected.start === absolute} type="button" key={absolute} onClick={() => onSelect?.(ref)} title={`Absolute ${snapshot.unit} ${absolute}`}><small>{absolute}</small><code>{snapshot.unit === "bit" ? value : String(value)}</code></button>; })}</div>
  </section>;
}
