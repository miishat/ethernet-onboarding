import { useEffect, useState } from "react";
import type { DataRef, Snapshot } from "../inspector/types";
import type { ValueView } from "./StageWorkspace";

const WINDOW = 64;
function overlaps(a: DataRef, b: DataRef) { return a.stage === b.stage && a.bufferId === b.bufferId && a.start < b.start + b.count && b.start < a.start + a.count; }
export default function DataWindow({ snapshot, view = "indexed", selected, linked = [], onSelect }: { snapshot: Snapshot; view?: ValueView; selected?: DataRef | null; linked?: readonly DataRef[]; onSelect?: (ref: DataRef) => void }) {
  const [start, setStart] = useState(0);
  const [expanded, setExpanded] = useState<number | null>(null);
  const values = snapshot.buffers[0]?.values || [];
  const groupSize = snapshot.stage === "encode66" ? 66 : 16;
  const pageSize = view === "grouped" ? groupSize * 4 : WINDOW;
  const focus = linked.find((ref) => ref.stage === snapshot.stage && ref.bufferId === snapshot.buffers[0]?.id);
  useEffect(() => { if (focus) { setStart(Math.floor(focus.start / pageSize) * pageSize); if (view === "grouped") setExpanded(Math.floor(focus.start / groupSize) * groupSize); } }, [focus?.stage, focus?.bufferId, focus?.start, pageSize, groupSize, view]);
  const safeStart = Math.floor(Math.min(start, Math.max(0, values.length - 1)) / pageSize) * pageSize;
  const end = Math.min(values.length, safeStart + pageSize);
  const valueButton = (absolute: number) => { const value = values[absolute]; const ref = { stage: snapshot.stage, bufferId: snapshot.buffers[0].id, start: absolute, count: 1 } as const; const linkedCell = linked.some((item) => overlaps(item, ref)); return <button className="data-window__value" data-linked={linkedCell || undefined} aria-pressed={selected?.stage === ref.stage && selected.bufferId === ref.bufferId && selected.start === absolute} type="button" key={absolute} onClick={() => onSelect?.(ref)} title={`Absolute ${snapshot.unit} ${absolute}`}><small>{absolute}</small><code>{snapshot.unit === "bit" ? value : String(value)}</code></button>; };
  const groups = Array.from({ length: Math.ceil((end - safeStart) / groupSize) }, (_, index) => { const from = safeStart + index * groupSize; const to = Math.min(end, from + groupSize); return { from, to }; });
  return <section className="data-window" aria-label={`${snapshot.stage} values`}>
    <div className="inspector-section-head"><span>Showing {values.length ? `${safeStart + 1}–${end}` : "0"} of {values.length} {snapshot.unit}s</span><div className="data-window__controls"><button className="btn" type="button" onClick={() => { setStart(Math.max(0, safeStart - pageSize)); setExpanded(null); }} disabled={safeStart === 0}>Previous</button><button className="btn" type="button" onClick={() => { setStart(Math.min(Math.max(0, values.length - 1), safeStart + pageSize)); setExpanded(null); }} disabled={end === values.length}>Next</button></div></div>
    {view === "grouped" ? <div className="data-window__groups">{groups.map(({ from, to }) => <div className="data-window__group" key={from}><button className="data-window__group-head" type="button" aria-expanded={expanded === from} onClick={() => setExpanded(expanded === from ? null : from)}><strong>{snapshot.stage === "encode66" ? "Block" : "Group"} {Math.floor(from / groupSize)}</strong><span>{snapshot.unit}s {from}–{to - 1}</span><code>{snapshot.stage === "encode66" ? `Sync ${values.slice(from, from + 2).join("")} · ` : ""}{values.slice(from, Math.min(to, from + 24)).join(snapshot.unit === "bit" ? "" : " ")}{to - from > 24 ? "…" : ""}</code></button>{expanded === from ? <div className="data-window__values">{Array.from({ length: to - from }, (_, index) => valueButton(from + index))}</div> : null}</div>)}</div> : <div className="data-window__indexed"><p>{snapshot.unit === "bit" ? "Bits" : "Values"} {safeStart}–{Math.max(safeStart, end - 1)}</p>{Array.from({ length: Math.ceil((end - safeStart) / 16) }, (_, row) => { const from = safeStart + row * 16; const to = Math.min(end, from + 16); return <div className="data-window__indexed-row" key={from}><span>{from}–{to - 1}</span><div className="data-window__values">{Array.from({ length: to - from }, (_, index) => valueButton(from + index))}</div></div>; })}</div>}
  </section>;
}
