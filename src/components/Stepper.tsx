import { useEffect, useState } from "react";
import type { Rate } from "../types";
import { STAGES } from "../data/stepper";
import { DATA } from "../data/stack";
import StageArt from "./StageArt";

export default function Stepper({ rate, onExit }: { rate: Rate; onExit: () => void }) {
  const [i, setI] = useState(0);
  const st = STAGES[i];
  const blockName = DATA[st.block] ? DATA[st.block].name : "";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setI((v) => Math.min(STAGES.length - 1, v + 1));
      else if (e.key === "ArrowLeft") setI((v) => Math.max(0, v - 1));
      else if (e.key === "Escape") onExit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onExit]);

  return (
    <div className="stepper">
      <div className="stepper__head">
        <div className="stepper__count">{i + 1 + " / " + STAGES.length}</div>
        <div className="stepper__title">{st.title}</div>
        <div className="stepper__meta">{blockName + "  ·  " + rate}</div>
      </div>

      <div className="stepper__art">
        <div className="stepper__figure" key={st.id}>
          <StageArt stage={st} rate={rate} />
        </div>
      </div>

      <div className="stepper__num">{st.count(rate)}</div>
      <div className="stepper__note">{st.note}</div>

      <div className="stepper__nav">
        <button className="btn" onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0}>
          Back
        </button>
        <button
          className="btn btn--primary"
          onClick={() => setI(Math.min(STAGES.length - 1, i + 1))}
          disabled={i === STAGES.length - 1}
        >
          {i === STAGES.length - 1 ? "At the medium" : "Next"}
        </button>
        <button className="btn" style={{ marginLeft: "auto" }} onClick={onExit}>
          Back to the stack
        </button>
      </div>

      <div className="stepper__ticks">
        {STAGES.map((s, k) => (
          <button
            key={s.id}
            className="stepper__tick"
            data-done={k <= i}
            onClick={() => setI(k)}
            title={s.title}
            aria-label={s.title}
          />
        ))}
      </div>
    </div>
  );
}
