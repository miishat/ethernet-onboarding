import { useEffect, useState } from "react";
import type { CompleteInspectorRun, DataRef } from "../inspector/types";
import type { ValueView } from "./StageWorkspace";

function overlaps(a: DataRef, b: DataRef) { return a.stage === b.stage && a.bufferId === b.bufferId && a.start < b.start + b.count && b.start < a.start + a.count; }

export default function Pam4View({ run, view = "indexed", selected, linked = [], onSelect }: { run: CompleteInspectorRun; view?: ValueView; selected?: DataRef | null; linked?: readonly DataRef[]; onSelect?: (ref: DataRef) => void }) {
  const [lane, setLane] = useState(0);
  const [start, setStart] = useState(0);
  const values = run.laneInspection.pam4[lane];
  const focus = linked.find((ref) => ref.stage === "pam4" && ref.bufferId === "pam4-levels");
  useEffect(() => { if (!focus) return; const width = run.laneInspection.pam4[0].length; setLane(Math.floor(focus.start / width)); setStart(Math.floor((focus.start % width) / 32) * 32); }, [focus?.start, run.laneInspection.pam4]);
  const end = Math.min(values.length, start + 32);
  const renderValue = (absolute: number) => { const value = values[absolute]; const ref = { stage: "pam4", bufferId: "pam4-levels", start: lane * values.length + absolute, count: 1 } as DataRef; return <button type="button" data-linked={linked.some((item) => overlaps(item, ref)) || undefined} aria-pressed={selected?.stage === ref.stage && selected.bufferId === ref.bufferId && selected.start === ref.start} onClick={() => onSelect?.(ref)} className="data-window__value" key={absolute}><small>Symbol {absolute}</small><code>dibit {value.dibit} · Gray {value.dibit} · level {value.normalizedLevel > 0 ? "+" : ""}{value.normalizedLevel}</code></button>; };
  const groups = Array.from({ length: Math.ceil((end - start) / 8) }, (_, index) => ({ from: start + index * 8, to: Math.min(end, start + (index + 1) * 8) }));
  return <section className="pam4-view" aria-label="PAM4 values">
    <p>Reference PMA mapping. Levels are normalized labels, not measured voltage or optical power.</p>
    <label className="inspector-select">PMD lane <select aria-label="PMD lane" value={lane} onChange={(event) => { setLane(Number(event.target.value)); setStart(0); }}>{[0, 1, 2, 3].map((value) => <option key={value} value={value}>PMD lane {value}</option>)}</select></label>
    <p>Showing {start + 1}–{end} of {values.length} symbols</p>
    {view === "grouped" ? <div className="lane-groups">{groups.map(({ from, to }) => <div className="lane-group" key={from}><strong>Symbols {from}–{to - 1}</strong><div className="lane-rows">{Array.from({ length: to - from }, (_, index) => renderValue(from + index))}</div></div>)}</div> : <div className="lane-rows">{Array.from({ length: end - start }, (_, index) => renderValue(start + index))}</div>}
    <div className="data-window__controls"><button className="btn" type="button" disabled={start === 0} onClick={() => setStart(Math.max(0, start - 32))}>Previous</button><button className="btn" type="button" disabled={end === values.length} onClick={() => setStart(Math.min(values.length - 1, start + 32))}>Next</button></div>
  </section>;
}
