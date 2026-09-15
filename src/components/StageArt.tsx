import React from "react";
import type { Rate, Stage } from "../types";
import { LANES } from "../data/stepper";
import { useC } from "../theme/ThemeContext";

/* deterministic pseudo-random for the scrambled look, so it does not flicker */
function prand(i: number): number {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export default function StageArt({ stage, rate }: { stage: Stage; rate: Rate }) {
  const C = useC();
  const W = 620,
    H = 150;
  const s = stage.shape;
  const cells: React.ReactNode[] = [];

  if (s === "octets") {
    for (let i = 0; i < 12; i++)
      cells.push(<rect key={i} x={20 + i * 48} y={55} width={42} height={40} rx={2} fill={C.ink3} stroke={C.rule} />);
    cells.push(<text key="l1" x={20} y={124} fill={C.faint} fontSize="11" fontFamily={C.mono}>octets from the MAC</text>);
  }

  if (s === "block66") {
    cells.push(<rect key="h1" x={20} y={55} width={26} height={40} rx={2} fill={C.signalWash} stroke={C.signal} />);
    cells.push(<rect key="h2" x={48} y={55} width={26} height={40} rx={2} fill={C.signalWash} stroke={C.signal} />);
    for (let i = 0; i < 8; i++)
      cells.push(<rect key={i} x={82 + i * 66} y={55} width={60} height={40} rx={2} fill={C.ink3} stroke={C.rule} />);
    cells.push(<text key="l1" x={20} y={46} fill={C.signal} fontSize="11" fontFamily={C.mono}>sync header</text>);
    cells.push(<text key="l2" x={82} y={46} fill={C.faint} fontSize="11" fontFamily={C.mono}>64 bits of payload</text>);
  }

  if (s === "block257") {
    for (let g = 0; g < 4; g++) {
      cells.push(<rect key={"g" + g} x={20 + g * 60} y={38} width={54} height={24} rx={2} fill={C.ink3} stroke={C.rule} />);
      cells.push(<rect key={"gh" + g} x={20 + g * 60} y={38} width={8} height={24} fill={C.signalDim} />);
    }
    cells.push(<text key="lt" x={272} y={54} fill={C.faint} fontSize="11" fontFamily={C.mono}>4 x 66 bits</text>);
    cells.push(<path key="ar" d="M 130 70 L 130 84" stroke={C.signal} strokeWidth="1.4" />);
    cells.push(<polygon key="ah" points="126,82 134,82 130,90" fill={C.signal} />);
    cells.push(<rect key="out" x={20} y={96} width={8} height={30} fill={C.signal} />);
    cells.push(<rect key="out2" x={30} y={96} width={330} height={30} rx={2} fill={C.ink3} stroke={C.signal} />);
    cells.push(<text key="lo" x={372} y={116} fill={C.signal} fontSize="11" fontFamily={C.mono}>1 x 257 bits</text>);
  }

  if (s === "scrambled") {
    for (let i = 0; i < 40; i++) {
      const v = prand(i);
      cells.push(<rect key={i} x={20 + i * 15} y={55} width={12} height={40} rx={1}
        fill={v > 0.5 ? C.ink3 : C.rule} stroke={C.rule} strokeWidth="0.6" />);
    }
    cells.push(<text key="l" x={20} y={124} fill={C.faint} fontSize="11" fontFamily={C.mono}>same content, no recognisable pattern</text>);
  }

  if (s === "marker") {
    cells.push(<rect key="am" x={20} y={55} width={120} height={40} rx={2} fill={C.signalWash} stroke={C.signal} />);
    cells.push(<text key="amt" x={30} y={80} fill={C.signal} fontSize="11" fontFamily={C.mono}>AM</text>);
    cells.push(<rect key="cm" x={62} y={61} width={34} height={28} rx={2} fill="none" stroke={C.signalDim} strokeDasharray="2 2" />);
    cells.push(<rect key="um" x={100} y={61} width={34} height={28} rx={2} fill="none" stroke={C.signalDim} strokeDasharray="2 2" />);
    for (let i = 0; i < 7; i++)
      cells.push(<rect key={i} x={150 + i * 66} y={55} width={60} height={40} rx={2} fill={C.ink3} stroke={C.rule} />);
    cells.push(<text key="l1" x={62} y={110} fill={C.faint} fontSize="10" fontFamily={C.mono}>common</text>);
    cells.push(<text key="l2" x={100} y={124} fill={C.faint} fontSize="10" fontFamily={C.mono}>unique</text>);
  }

  if (s === "codeword") {
    cells.push(<rect key="m" x={20} y={55} width={430} height={40} rx={2} fill={C.ink3} stroke={C.rule} />);
    cells.push(<text key="mt" x={32} y={80} fill={C.dim} fontSize="12" fontFamily={C.mono}>514 message symbols</text>);
    for (let i = 0; i < 10; i++)
      cells.push(<rect key={"p" + i} x={456 + i * 15} y={55} width={12} height={40} rx={1} fill={C.signalWash} stroke={C.signal} strokeWidth="0.8" />);
    cells.push(<text key="pt" x={456} y={124} fill={C.signal} fontSize="11" fontFamily={C.mono}>30 parity symbols</text>);
    cells.push(<text key="st" x={20} y={46} fill={C.faint} fontSize="10" fontFamily={C.mono}>one symbol = 10 bits; damage is counted in symbols</text>);
  }

  if (s === "lanes" || s === "phys") {
    const n = (s === "lanes" ? LANES[rate].pcs : LANES[rate].phys) || LANES[rate].phys;
    const rows = Math.min(n, 16);
    const rh = Math.max(6, Math.floor(110 / rows) - 2);
    for (let i = 0; i < rows; i++) {
      const y = 28 + i * (rh + 2);
      cells.push(<rect key={"l" + i} x={70} y={y} width={470} height={rh} rx={1}
        fill={i % 2 ? C.ink3 : C.ink2} stroke={C.rule} strokeWidth="0.5" />);
      if (s === "phys")
        cells.push(<rect key={"s" + i} x={70} y={y} width={470} height={rh} rx={1} fill={C.signalWash} stroke={C.signalDim} strokeWidth="0.5" />);
    }
    cells.push(<text key="t" x={20} y={34} fill={C.faint} fontSize="10" fontFamily={C.mono}>lane 0</text>);
    cells.push(<text key="t2" x={20} y={28 + (rows - 1) * (rh + 2) + rh} fill={C.faint} fontSize="10" fontFamily={C.mono}>{"lane " + (rows - 1)}</text>);
    cells.push(<text key="t3" x={548} y={78} fill={s === "phys" ? C.signal : C.dim} fontSize="11" fontFamily={C.mono}>{n}</text>);
  }

  if (s === "pam4") {
    const levels = [40, 68, 96, 124];
    const seq = [0, 2, 3, 1, 2, 0, 1, 3, 3, 2, 0, 1, 1, 3, 2, 0];
    let d = "M 20 " + levels[seq[0]];
    seq.forEach((v, i) => {
      const x1 = 20 + (i + 1) * 37;
      d += " L " + x1 + " " + levels[v];
      if (i < seq.length - 1) d += " L " + x1 + " " + levels[seq[i + 1]];
    });
    levels.forEach((y, i) => {
      cells.push(<line key={"g" + i} x1={20} y1={y} x2={612} y2={y} stroke={C.ruleSoft} strokeWidth="0.8" strokeDasharray="2 4" />);
      cells.push(<text key={"gt" + i} x={0} y={y + 4} fill={C.faint} fontSize="10" fontFamily={C.mono}>{3 - i}</text>);
    });
    cells.push(<path key="w" d={d} stroke={C.signal} strokeWidth="1.6" fill="none" />);
    cells.push(<text key="l" x={20} y={144} fill={C.faint} fontSize="10" fontFamily={C.mono}>four levels, two bits per symbol</text>);
  }

  return (
    <svg viewBox={"0 0 " + W + " " + H} className="svg-canvas">
      {cells}
    </svg>
  );
}
