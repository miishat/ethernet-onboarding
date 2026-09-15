import React from "react";
import type { Rate, Dir, StackNode } from "../types";
import { pick } from "../data/tree";
import { useC, useZones } from "../theme/ThemeContext";
import { fitProps } from "./fit";

interface Props {
  node: StackNode;
  kids: StackNode[];
  rate: Rate;
  dir: Dir;
  visited: Set<string>;
  onPick: (id: string) => void;
  zone: string;
  litId: string | null;
}

export default function DrillCanvas({ node, kids, rate, dir, visited, onPick, zone, litId }: Props) {
  const C = useC();
  const ZONES = useZones();
  const hue = ZONES[zone] ? ZONES[zone].hue : C.rule;
  const BX = 122,
    BW = 456,
    BH = 54,
    GAP = 16,
    TOP = 62;
  const H = TOP + Math.max(kids.length, 1) * (BH + GAP) + 8;

  const openKey = (e: React.KeyboardEvent, id: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onPick(id);
    }
  };

  return (
    <svg viewBox={"0 0 700 " + H} className="svg-canvas canvas-anim">
      <text x={BX} y={26} fill={C.text} fontSize="17" fontWeight="600"
        {...fitProps(node.name, 17, 700 - BX - 12, false)}>{node.name}</text>
      {(() => {
        const line =
          (pick(node.clause, rate) ? pick(node.clause, rate) + "   ·   " : "") +
          (dir === "tx" ? "transmit" : "receive") +
          "   ·   " +
          rate;
        return (
          <text x={BX} y={46} fill={C.faint} fontSize="11" fontFamily={C.mono} {...fitProps(line, 11, 700 - BX - 12, true)}>
            {line}
          </text>
        );
      })()}

      {!kids.length ? (
        <text x={BX} y={TOP + 24} fill={C.faint} fontSize="12" fontFamily={C.mono}>
          {"Nothing in the " + (dir === "tx" ? "transmit" : "receive") + " direction here."}
        </text>
      ) : null}

      {kids.slice(0, -1).map((s, i) => {
        const y = TOP + i * (BH + GAP) + BH;
        const x = BX + BW / 2;
        return (
          <g key={"c" + s.id}>
            <line x1={x} y1={y} x2={x} y2={y + GAP - 6} stroke={C.rule} strokeWidth="1" />
            <polygon points={x - 3.5 + "," + (y + GAP - 7) + " " + (x + 3.5) + "," + (y + GAP - 7) + " " + x + "," + (y + GAP)} fill={C.rule} />
          </g>
        );
      })}

      {kids.map((s, i) => {
        const y = TOP + i * (BH + GAP);
        const lit = litId === s.id;
        const grandkids = (s.subs || s.sections || []).length;
        const tag = s.written === false ? "outline" : grandkids ? grandkids + " inside" : "page";
        return (
          <g key={s.id} className="node-block" onClick={() => onPick(s.id)} tabIndex={0} role="button"
            aria-label={s.name} onKeyDown={(e) => openKey(e, s.id)}>
            <rect x={BX} y={y} width={BW} height={BH} rx={6}
              fill={lit ? C.signalWash : C.ink3} stroke={lit ? C.signal : hue} strokeWidth={lit ? 1.8 : 1.1} />
            <text className="nb-title" x={BX + 14} y={y + 23} fill={lit ? C.signal : C.text} fontSize="14"
              {...fitProps(s.name, 14, BW - 28 - 44, false)}>{s.name}</text>
            <text x={BX + 14} y={y + 41} fill={C.faint} fontSize="10" fontFamily={C.mono}>
              {(s.dir && s.dir !== "both" ? s.dir.toUpperCase() + "  ·  " : "") + tag}
            </text>
            {visited.has(s.id) ? (
              <text x={BX + BW - 14} y={y + 33} textAnchor="end" fill={C.good} fontSize="10" fontFamily={C.mono}>read</text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
