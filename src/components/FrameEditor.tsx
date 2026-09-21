import { useState } from "react";
import { DEFAULT_FRAME } from "../inspector/defaults";
import { parseFrame } from "../inspector/engine/validation";
import type { FrameDraft, FrameInput } from "../inspector/types";

interface Props {
  draft: FrameDraft;
  onDraftChange: (draft: FrameDraft) => void;
  onApply: (input: FrameInput) => void;
}

const fields: readonly { id: keyof FrameDraft; label: string; hint: string; multiline?: boolean }[] = [
  { id: "destination", label: "Destination MAC", hint: "Six hexadecimal octets, separated by colons." },
  { id: "source", label: "Source MAC", hint: "An individual source address." },
  { id: "etherType", label: "EtherType", hint: "Four hexadecimal digits." },
  { id: "payloadHex", label: "Payload hex", hint: "Whole hexadecimal octets. Whitespace is allowed.", multiline: true },
];

export default function FrameEditor({ draft, onDraftChange, onApply }: Props) {
  const [errors, setErrors] = useState<Partial<Record<keyof FrameDraft, string>>>({});

  const apply = () => {
    const result = parseFrame(draft);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    onApply(result.value);
  };

  return <section className="frame-editor" aria-labelledby="frame-editor-title">
    <div className="inspector-section-head">
      <div><p className="inspector-eyebrow">MAC input</p><h2 id="frame-editor-title">Editable Ethernet frame</h2></div>
      <button className="btn" type="button" onClick={() => { setErrors({}); onDraftChange({ ...DEFAULT_FRAME }); }}>Reset sample</button>
    </div>
    <div className="frame-editor__fields">
      {fields.map(({ id, label, hint, multiline }) => <label key={id} className="frame-editor__field">
        <span>{label}</span>
        {multiline ? <textarea value={draft[id]} rows={4} aria-invalid={!!errors[id]} aria-describedby={`${id}-hint ${errors[id] ? `${id}-error` : ""}`} onChange={(event) => onDraftChange({ ...draft, [id]: event.target.value })} />
          : <input value={draft[id]} aria-invalid={!!errors[id]} aria-describedby={`${id}-hint ${errors[id] ? `${id}-error` : ""}`} onChange={(event) => onDraftChange({ ...draft, [id]: event.target.value })} />}
        <small id={`${id}-hint`}>{hint}</small>
        {errors[id] ? <span id={`${id}-error`} className="frame-editor__error" role="alert">{errors[id]}</span> : null}
      </label>)}
    </div>
    <div className="frame-editor__actions"><button className="btn btn--primary" type="button" onClick={apply}>Apply frame</button><span aria-live="polite">{Object.keys(errors).length ? "Fix the highlighted input." : "Applies only when you choose Apply frame."}</span></div>
  </section>;
}
