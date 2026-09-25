import { useMemo, useState } from "react";
import type { CompleteInspectorRun, DataRef, FrameDraft, FrameInput, InspectorStage, MacFrame } from "../inspector/types";
import { buildMacFrame } from "../inspector/engine/mac";
import { parseFrame } from "../inspector/engine/validation";
import FrameEditor from "./FrameEditor";
import StageRail from "./StageRail";
import FieldDetails from "./FieldDetails";
import StageWorkspace from "./StageWorkspace";
import "./inspector.css";

interface Props { stage: InspectorStage; onStageChange: (stage: InspectorStage) => void; onExit: () => void; draft: FrameDraft; onDraftChange: (draft: FrameDraft) => void; prefixIdleOctets?: number; onPrefixIdleOctetsChange?: (value: number) => void; mac?: MacFrame | null; onApply: (input: FrameInput) => void; run?: CompleteInspectorRun | null; status?: "idle" | "running" | "ready" | "error"; error?: string | null; calculationUnavailableReason?: string | null; }

function hex(bytes: Uint8Array) { return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(" "); }
function previewHex(bytes: Uint8Array) { return bytes.length > 12 ? `${hex(bytes.slice(0, 12))} …` : hex(bytes); }

export default function FrameInspector({ stage, onStageChange, onExit, draft, onDraftChange, prefixIdleOctets = 256, onPrefixIdleOctetsChange, mac = null, onApply, run = null, status = "idle", error = null, calculationUnavailableReason = null }: Props) {
  const [selected, setSelected] = useState("destination");
  const [traceSelection, setTraceSelection] = useState<DataRef | null>(null);
  const pending = useMemo(() => { const parsed = parseFrame(draft); return !parsed.ok || !mac || hex(buildMacFrame(parsed.value).bytes) !== hex(mac.bytes) || (!!run && run.stream.prefixIdleOctets !== prefixIdleOctets); }, [draft, mac, run, prefixIdleOctets]);
  const selectedField = mac?.fields.find((field) => field.id === selected) || mac?.fields[0];
  const unavailable = (!!calculationUnavailableReason && stage !== "mac") || (!run && stage !== "mac");
  return <main className="inspector" aria-label="Frame inspector">
    <div className="inspector__top"><div><p className="inspector-eyebrow">Experimental candidate calculation</p><h1>Frame inspector</h1><p>Applied values use a candidate reference mapping; IEEE-only 400G TX remains verification-blocked.</p></div><button className="btn" type="button" onClick={onExit}>Return to learning</button></div>
    <StageRail stage={stage} onStageChange={onStageChange} profileId={run?.profileId} />
    {status === "running" ? <p className="inspector__pending" aria-live="polite">Calculating applied frame…</p> : null}{error ? <p role="alert" className="frame-editor__error">{error}</p> : null}
    {unavailable ? <section className="inspector__unavailable" aria-label="Unavailable calculation" aria-live="polite"><h2>{stage.replace(/-/g, " ")}</h2><p>{calculationUnavailableReason || "Calculation not available yet. Apply a frame using the experimental reference contract to inspect calculated values. The IEEE-only profile remains verification-blocked."}</p></section> : stage !== "mac" && run ? <StageWorkspace run={run} stage={stage} selected={traceSelection} onSelect={setTraceSelection} /> : <>
      {pending ? <p className="inspector__pending" aria-live="polite">Unapplied edits</p> : null}
      <div className="inspector__grid"><FrameEditor draft={draft} onDraftChange={onDraftChange} onApply={onApply} prefixIdleOctets={prefixIdleOctets} onPrefixIdleOctetsChange={onPrefixIdleOctetsChange} applyUnavailableReason={calculationUnavailableReason} />
        {mac && selectedField ? <div className="inspector__output"><FieldDetails field={selectedField} mac={mac} /><section className="byte-view" aria-labelledby="byte-view-title"><div className="inspector-section-head"><div><p className="inspector-eyebrow">MAC output</p><h2 id="byte-view-title">Frame bytes</h2></div><span>{mac.bytes.length} bytes total</span></div><div className="byte-view__bytes" data-field-count={mac.fields.length}>{mac.fields.map((field) => <button key={field.id} type="button" aria-pressed={selected === field.id} onClick={() => setSelected(field.id)} title={`${field.length} bytes at offset ${field.offset}`}><strong>{field.id === "fcs" ? "FCS" : field.id}</strong><code>{previewHex(mac.bytes.slice(field.offset, field.offset + field.length))}</code><small>{field.length} bytes · offset {field.offset}</small></button>)}</div></section></div> : <section className="inspector__empty">Apply a valid frame to view bytes and FCS.</section>}</div>
    </>}
  </main>;
}
