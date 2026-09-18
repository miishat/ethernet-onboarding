import React from "react";
import type { Rate, Dir, LaneGen } from "../types";
import { DATA, CORE, IFACE, ASIDE } from "../data/stack";
import { laneInfo, PCS_LANES } from "../data/stepper";
import { pick } from "../data/tree";
import { useC, useZones } from "../theme/ThemeContext";
import { fitProps } from "./fit";

/* lane count annotated on the connectors between sublayers */
function laneLabel(from: string, to: string, rate: Rate, gen: LaneGen): string | null {
  const boundary = [from, to].sort().join(":");
  if (boundary === "fec:pcs" || boundary === "fec:pma") {
    return PCS_LANES[rate] ? PCS_LANES[rate] + " PCS lanes" : null;
  }
  if (boundary === "pma:pmd" || boundary === "medium:pmd") {
    return laneInfo(rate, gen).phys + " physical lanes";
  }
  return null;
}

/* The map needs a scannable reference, while the detail panel keeps the full clause wording. */
function compactReference(clause: string): string {
  const draft = /draft/i.test(clause) ? " (draft)" : "";
  const references = clause
    .replace(/\(draft\)/gi, "")
    .split(";")
    .map((part) => {
      const reference = part.trim();
      if (!/^clauses?\b/i.test(reference)) return reference;
      const refs = reference.match(/\d+(?:-\d+)?/g);
      return refs && refs.length ? "Clause " + refs.join(" + ") : reference;
    })
    .filter(Boolean)
    .join("; ");
  return references + draft;
}

function pmaCardValues(rate: Rate, gen: LaneGen) {
  const clause = rate === "400G"
    ? (gen === "100" ? "Clause 120" : "Clause 176")
    : rate === "800G"
      ? (gen === "100" ? "Clause 173" : "Clause 176")
      : "Clause 176 (draft)";
  return { clause, face: laneInfo(rate, gen).phys + " lanes" };
}

interface Props {
  rate: Rate;
  dir: Dir;
  gen: LaneGen;
  onOpen: (id: string) => void;
  complete: (id: string) => boolean;
}

export default function StackCanvas({ rate, dir, gen, onOpen, complete }: Props) {
  const C = useC();
  const ZONES = useZones();
  const order = dir === "tx" ? CORE : CORE.slice().reverse();

  const ASIDE_X = 8,
    ASIDE_W = 168;
  const GUTTER_X = 190;
  const BAND_X = 204,
    BAND_W = 282;
  const BX = 204,
    BW = 282,
    BH = 70,
    GAP = 42;
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
          <text x={GUTTER_X} y={(b.top + b.bot) / 2} fill={C.faint} fontSize="11" fontFamily={C.mono}
            textAnchor="middle" transform={"rotate(-90 " + GUTTER_X + " " + (b.top + b.bot) / 2 + ")"}>
            {ZONES[b.z].label}
          </text>
        </g>
      ))}

      <text x={BX} y={30} fill={C.faint} fontSize="12" fontFamily={C.mono}>
        {dir === "tx" ? "transmit - MAC to medium" : "receive - medium to MAC"}
      </text>

      {order.slice(0, -1).map((id, i) => {
        const y = yOf[id] + BH;
        const x = BX + BW / 2;
        const ll = laneLabel(id, order[i + 1], rate, gen);
        return (
          <g key={"c" + id}>
            <line x1={x} y1={y} x2={x} y2={y + GAP - 7} stroke={C.rule} strokeWidth="1" />
            <polygon points={x - 4 + "," + (y + GAP - 8) + " " + (x + 4) + "," + (y + GAP - 8) + " " + x + "," + (y + GAP)} fill={C.rule} />
            {ll ? (
              <g>
                <line x1={x + 4} y1={y + GAP / 2} x2={x + 14} y2={y + GAP / 2} stroke={C.ruleSoft} strokeWidth="0.8" />
                <text x={x + 19} y={y + GAP / 2 + 4} fill={C.dim} fontSize="11.5" fontFamily={C.mono}>{ll}</text>
              </g>
            ) : null}
          </g>
        );
      })}

          {order.map((id) => {
            const n = DATA[id];
            const y = yOf[id];
            const pmaValues = id === "pma" ? pmaCardValues(rate, gen) : null;
            const face = pmaValues ? pmaValues.face : pick(n.face, rate);
            const cl = pmaValues ? pmaValues.clause : pick(n.clause, rate) || "";
        const ref = compactReference(cl);
        const isDraft = /draft/i.test(cl);
        const nameMax = BW - 28;
        const referenceMax = BW - 28;
        return (
          <g key={id} className="node-block" onClick={() => onOpen(id)} tabIndex={0} role="button"
            aria-label={n.name} onKeyDown={(e) => openKey(e, id)}>
            <rect x={BX} y={y} width={BW} height={BH} rx={6} fill={C.ink3} stroke={ZONES[n.zone!].hue} strokeWidth="1.2" />
            <text className="nb-title" x={BX + 14} y={y + 25} fill={C.text} fontSize="15.5" fontWeight="600"
              {...fitProps(n.name, 15.5, nameMax, false)}>{n.name}</text>
            <text x={BX + 14} y={y + 52} fill={C.diagram} fontSize="11.5" fontWeight="600" fontFamily={C.mono}
              {...fitProps(ref, 11.5, referenceMax, true)}>{ref}</text>
            {face ? (
              <text x={BX + BW - 14} y={y + 25} textAnchor="end" fill={isDraft ? C.signal : C.dim} fontSize="12.5" fontFamily={C.mono}
                {...fitProps(face, 12.5, BW / 2, true)}>{face}</text>
            ) : null}
            {complete(id) && !face ? (
              <text x={BX + BW - 14} y={y + 52} textAnchor="end" fill={C.good} fontSize="11" fontFamily={C.mono}>read</text>
            ) : null}
          </g>
        );
      })}

      <text x={ASIDE_X} y={TOP + 2} fill={C.faint} fontSize="11" fontFamily={C.mono}>adjacent + cross-cutting</text>
      {ASIDE.map((id, i) => {
        const y = asideTop + i * 42;
        return (
          <g key={id} className="node-block" onClick={() => onOpen(id)} tabIndex={0} role="button"
            aria-label={DATA[id].name} onKeyDown={(e) => openKey(e, id)}>
            <rect x={ASIDE_X} y={y} width={ASIDE_W} height={34} rx={6} fill={C.ink2} stroke={C.rule} strokeDasharray="3 3" />
            <text x={ASIDE_X + 11} y={y + 22} fill={C.dim} fontSize="12"
              {...fitProps(DATA[id].name, 12, ASIDE_W - 22, false)}>{DATA[id].name}</text>
          </g>
        );
      })}

      <text x={IFACE_X} y={ifaceTop - 12} fill={C.faint} fontSize="11" fontFamily={C.mono}>electrical + modules</text>
      {IFACE.map((id, i) => {
        const y = ifaceTop + i * 42;
        return (
          <g key={id} className="node-block" onClick={() => onOpen(id)} tabIndex={0} role="button"
            aria-label={DATA[id].name} onKeyDown={(e) => openKey(e, id)}>
            <rect x={IFACE_X} y={y} width={IFACE_W} height={34} rx={6} fill={C.ink2} stroke={C.rule} strokeDasharray="3 3" />
            <text x={IFACE_X + 11} y={y + 22} fill={C.dim} fontSize="12"
              {...fitProps(DATA[id].name, 12, IFACE_W - 22, false)}>{DATA[id].name}</text>
          </g>
        );
      })}
    </svg>
  );
}
