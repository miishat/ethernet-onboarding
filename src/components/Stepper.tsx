import { useEffect, useState } from "react";
import type { Rate, Dir, LaneGen } from "../types";
import { stagesFor } from "../data/stepper";
import { DATA } from "../data/stack";
import StageArt from "./StageArt";
import StepperMiniStack from "./StepperMiniStack";

export default function Stepper({
  rate,
  dir,
  gen,
  onExit,
}: {
  rate: Rate;
  dir: Dir;
  gen: LaneGen;
  onExit: () => void;
}) {
  const stages = stagesFor(dir);
  const [i, setI] = useState(0);

  /* direction flips the whole pipeline; start the new one from the top */
  useEffect(() => {
    setI(0);
  }, [dir]);

  const clamped = Math.min(i, stages.length - 1);
  const st = stages[clamped];
  const blockName = DATA[st.block] ? DATA[st.block].name : "";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setI((v) => Math.min(stages.length - 1, v + 1));
      else if (e.key === "ArrowLeft") setI((v) => Math.max(0, v - 1));
      else if (e.key === "Escape") onExit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onExit, stages.length]);

  const atEnd = clamped === stages.length - 1;

  return (
    <div className="stepper-shell">
      <StepperMiniStack blockId={st.block} dir={dir} />

      <div className="stepper">
        <div className="stepper__head">
          <div className="stepper__count">{clamped + 1 + " / " + stages.length}</div>
          <div className="stepper__title">{st.title}</div>
          <div className="stepper__meta">{blockName + "  ·  " + (dir === "rx" ? "receive" : "transmit") + "  ·  " + rate}</div>
        </div>

        <div className="stepper__art">
          <div className="stepper__figure" key={st.id}>
            <StageArt stage={st} rate={rate} gen={gen} />
          </div>
        </div>

        <div className="stepper__num">{st.count(rate, gen)}</div>
        <div className="stepper__note">{st.note}</div>

        <div className="stepper__nav">
          <button className="btn" onClick={() => setI(Math.max(0, clamped - 1))} disabled={clamped === 0}>
            Back
          </button>
          <button
            className="btn btn--primary"
            onClick={() => setI(Math.min(stages.length - 1, clamped + 1))}
            disabled={atEnd}
          >
            {atEnd ? (dir === "rx" ? "At the MAC" : "At the medium") : "Next"}
          </button>
          <button className="btn" style={{ marginLeft: "auto" }} onClick={onExit}>
            Back to the stack
          </button>
        </div>

        <div className="stepper__ticks">
          {stages.map((s, k) => (
            <button
              key={s.id}
              className="stepper__tick"
              data-done={k <= clamped}
              onClick={() => setI(k)}
              title={s.title}
              aria-label={s.title}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
