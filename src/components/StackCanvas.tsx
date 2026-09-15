import React from "react";
import type { Rate, Dir } from "../types";
import { DATA, CORE, IFACE, ASIDE } from "../data/stack";
import { LANES } from "../data/stepper";
import { pick } from "../data/tree";
import { useC, useZones } from "../theme/ThemeContext";
import { estWidth, fitProps } from "./fit";

/* lane count annotated on the connectors between sublayers */
function laneLabel(id: string, rate: Rate): string | null {
  const L = LANES[rate];
  if (!L) return null;
  if (id === "pcs" || id === "fec") return L.pcs ? L.pcs + " PCS lanes" : null;
  if (id === "pma" || id === "pmd") return L.phys + " physical lanes";
  return null;
}

interface Props {
  rate: Rate;
  dir: Dir;
  onOpen: (id: string) => void;
  complete: (id: string) => boolean;
}

export default function StackCanvas({ rate, dir, onOpen, complete }: Props) {
  const C = useC();
  const ZONES = useZones();
  const order = dir === "tx" ? CORE : CORE.slice().reverse();

  const ASIDE_X = 8,
    ASIDE_W = 168;
  const GUTTER_X = 190;
  const BAND_X = 204,
    BAND_W = 282;
  const BX = 218,
    BW = 254,
    BH = 62,
    GAP = 30;
  const IFACE_X = 506,
    IFACE_W = 180;
  const W = 700,
    TOP = 48;

  const yOf: Record<string, number> = {};
  order.forEach((id, i) => {
    yOf[id] = TOP + i * (BH + GAP);
  });
  const colBottom = TOP + order.length * (BH + GAP) - GAP;

  const bands = Object.keys(ZONES)
    .map((z) => {
      const ys = order.filter((id) => DATA[id].zone === z && CORE.indexOf(id) >= 0).map((id) => yOf[id]);
      if (!ys.length) return null;
      return { z, top: Math.min.apply(null, ys) - 9, bot: Math.max.apply(null, ys) + BH + 9 };
    })
    .filter(Boolean) as Array<{ z: string; top: number; bot: number }>;

  const asideTop = TOP + 16;
  const ifaceTop = yOf["pma"] !== undefined ? yOf["pma"] : TOP;
  const H = Math.max(colBottom, asideTop + ASIDE.length * 42, ifaceTop + IFACE.length * 42) + 26;

  const openKey = (e: React.KeyboardEvent, id: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen(id);
    }
  };

  return (
    <svg viewBox={"0 0 " + W + " " + H} className="svg-canvas canvas-anim">
      {bands.map((b) => (
        <g key={b.z}>
          <rect x={BAND_X} y={b.top} width={BAND_W} height={b.bot - b.top} rx={6}
            fill={ZONES[b.z].fill} stroke={ZONES[b.z].hue} strokeWidth="1" />
          <text x={GUTTER_X} y={(b.top + b.bot) / 2} fill={C.faint} fontSize="10" fontFamily={C.mono}
            textAnchor="middle" transform={"rotate(-90 " + GUTTER_X + " " + (b.top + b.bot) / 2 + ")"}>
            {ZONES[b.z].label}
          </text>
        </g>
      ))}

      <text x={BX} y={30} fill={C.faint} fontSize="11" fontFamily={C.mono}>
        {dir === "tx" ? "transmit - MAC to medium" : "receive - medium to MAC"}
      </text>

      {order.slice(0, -1).map((id, i) => {
        const y = yOf[id] + BH;
        const x = BX + BW / 2;
        const ll = laneLabel(order[i + 1], rate);
        return (
          <g key={"c" + id}>
            <line x1={x} y1={y} x2={x} y2={y + GAP - 7} stroke={C.rule} strokeWidth="1" />
            <polygon points={x - 4 + "," + (y + GAP - 8) + " " + (x + 4) + "," + (y + GAP - 8) + " " + x + "," + (y + GAP)} fill={C.rule} />
            {ll ? (
              <g>
                <line x1={x + 4} y1={y + GAP / 2} x2={x + 14} y2={y + GAP / 2} stroke={C.ruleSoft} strokeWidth="0.8" />
                <text x={x + 19} y={y + GAP / 2 + 4} fill={C.dim} fontSize="10.5" fontFamily={C.mono}>{ll}</text>
              </g>
            ) : null}
          </g>
        );
      })}

      {order.map((id) => {
        const n = DATA[id];
        const y = yOf[id];
        const face = pick(n.face, rate);
        const cl = pick(n.clause, rate) || "";
        const isDraft = /draft/i.test(cl);
        const faceW = face ? estWidth(face, 11.5, true) : 0;
        const nameMax = BW - 28 - (faceW ? faceW + 12 : 0);
        const clauseMax = BW - 28 - (complete(id) ? 40 : 4);
        return (
          <g key={id} className="node-block" onClick={() => onOpen(id)} tabIndex={0} role="button"
            aria-label={n.name} onKeyDown={(e) => openKey(e, id)}>
            <rect x={BX} y={y} width={BW} height={BH} rx={6} fill={C.ink3} stroke={ZONES[n.zone!].hue} strokeWidth="1.2" />
            <text className="nb-title" x={BX + 14} y={y + 25} fill={C.text} fontSize="15" fontWeight="600"
              {...fitProps(n.name, 15, nameMax, false)}>{n.name}</text>
            <text x={BX + 14} y={y + 44} fill={C.faint} fontSize="10" fontFamily={C.mono}
              {...fitProps(cl, 10, clauseMax, true)}>{cl}</text>
            {face ? (
              <text x={BX + BW - 14} y={y + 25} textAnchor="end" fill={isDraft ? C.signal : C.dim} fontSize="11.5" fontFamily={C.mono}
                {...fitProps(face, 11.5, BW / 2, true)}>{face}</text>
            ) : null}
            {complete(id) ? (
              <text x={BX + BW - 14} y={y + 44} textAnchor="end" fill={C.good} fontSize="10" fontFamily={C.mono}>read</text>
            ) : null}
          </g>
        );
      })}

      <text x={ASIDE_X} y={TOP + 2} fill={C.faint} fontSize="10" fontFamily={C.mono}>adjacent + cross-cutting</text>
      {ASIDE.map((id, i) => {
        const y = asideTop + i * 42;
        return (
          <g key={id} className="node-block" onClick={() => onOpen(id)} tabIndex={0} role="button"
            aria-label={DATA[id].name} onKeyDown={(e) => openKey(e, id)}>
            <rect x={ASIDE_X} y={y} width={ASIDE_W} height={34} rx={6} fill={C.ink2} stroke={C.rule} strokeDasharray="3 3" />
            <text x={ASIDE_X + 11} y={y + 22} fill={C.dim} fontSize="12.5">{DATA[id].name}</text>
          </g>
        );
      })}

      <text x={IFACE_X} y={ifaceTop - 12} fill={C.faint} fontSize="10" fontFamily={C.mono}>electrical + modules</text>
      {IFACE.map((id, i) => {
        const y = ifaceTop + i * 42;
        return (
          <g key={id} className="node-block" onClick={() => onOpen(id)} tabIndex={0} role="button"
            aria-label={DATA[id].name} onKeyDown={(e) => openKey(e, id)}>
            <rect x={IFACE_X} y={y} width={IFACE_W} height={34} rx={6} fill={C.ink2} stroke={C.rule} strokeDasharray="3 3" />
            <text x={IFACE_X + 11} y={y + 22} fill={C.dim} fontSize="12.5">{DATA[id].name}</text>
          </g>
        );
      })}
    </svg>
  );
}
