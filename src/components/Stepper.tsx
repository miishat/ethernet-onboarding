import { useEffect } from "react";
import type { Rate, Dir, LaneGen } from "../types";
import { stagesFor, STAGE_LINKS } from "../data/stepper";
import { DATA } from "../data/stack";
import { pathTo, nodeAt } from "../data/tree";
import StageArt from "./StageArt";
import StepperMiniStack from "./StepperMiniStack";
import MathText from "./MathText";

export default function Stepper({
  rate,
  dir,
  gen,
  index,
  onIndexChange,
  onExit,
  onNavigate,
}: {
  rate: Rate;
  dir: Dir;
  gen: LaneGen;
  index: number;
  onIndexChange: (index: number) => void;
  onExit: () => void;
  onNavigate: (path: string[]) => void;
}) {
  const stages = stagesFor(dir);
  const clamped = Math.min(index, stages.length - 1);
  const st = stages[clamped];
  const blockName = DATA[st.block] ? DATA[st.block].name : "";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") onIndexChange(Math.min(stages.length - 1, clamped + 1));
      else if (e.key === "ArrowLeft") onIndexChange(Math.max(0, clamped - 1));
      else if (e.key === "Escape") onExit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clamped, onExit, onIndexChange, stages.length]);

  const atEnd = clamped === stages.length - 1;

  const linkId = STAGE_LINKS[st.id];
  const linkPath = linkId ? pathTo(linkId) : null;
  const linkName = linkPath ? nodeAt(linkPath)?.name : null;

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

        <div className="stepper__num"><MathText text={st.count(rate, gen)} /></div>
        <div className="stepper__note">{st.note}</div>

        {linkPath && linkName ? (
          <div className="stepper__more">
            <button className="link-arrow" onClick={() => onNavigate(linkPath)}>
              Read more: {linkName} <span aria-hidden="true">→</span>
            </button>
          </div>
        ) : null}

        <div className="stepper__nav">
          <button className="btn" onClick={() => onIndexChange(Math.max(0, clamped - 1))} disabled={clamped === 0}>
            Back
          </button>
          <button
            className="btn btn--primary"
            onClick={() => onIndexChange(Math.min(stages.length - 1, clamped + 1))}
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
              onClick={() => onIndexChange(k)}
              title={s.title}
              aria-label={s.title}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
