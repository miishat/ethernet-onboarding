import React, { useEffect, useState } from "react";
import type { Rate, DiagramSpec } from "../types";
import { useC, useZones } from "../theme/ThemeContext";
import { estWidth, fitProps } from "./fit";

/* a fixed, non-identity arrival order, so the reorder diagram is stable */
function shuffleOrder(n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push((i * 7 + 3) % n);
  return out;
}

export function Note({ text }: { text: string }) {
  return <figcaption className="figure__caption">{text}</figcaption>;
}

/* ---------------------------------------------------------------------------
   Figure - title, graphic, caption, and an enlarge affordance. Narrow columns
   scale SVG type down with them, so every diagram can be reopened at window
   width where the labels are legible again.
   --------------------------------------------------------------------------- */
function Figure({
  title,
  caption,
  render,
}: {
  title?: string;
  caption?: string;
  render: (constrain: boolean) => React.ReactNode;
}) {
  const [big, setBig] = useState(false);

  useEffect(() => {
    if (!big) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setBig(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [big]);

  return (
    <figure className="figure">
      <div className="figure__head">
        {title ? <div className="figure__title">{title}</div> : <span />}
        <button className="figure__zoom" onClick={() => setBig(true)}>
          enlarge
        </button>
      </div>
      <div className="figure__frame">{render(true)}</div>
      {caption ? <Note text={caption} /> : null}

      {big ? (
        <div
          className="modal-backdrop"
          onClick={() => setBig(false)}
          role="dialog"
          aria-label={title || "diagram"}
          style={{ cursor: "zoom-out" }}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            {/* one aligned column: title, diagram and caption share a width so the
                caption never stops mid-card leaving a lopsided gap */}
            <div className="modal-content">
              {title ? (
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>{title}</div>
              ) : null}
              {render(false)}
              {caption ? (
                <p className="figure__caption" style={{ margin: "14px 0 0", fontSize: 13.5, maxWidth: "none", lineHeight: 1.6 }}>
                  {caption}
                </p>
              ) : null}
              <div style={{ marginTop: 18, fontFamily: "var(--font-mono)", fontSize: 11, opacity: 0.7 }}>
                click outside to close
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </figure>
  );
}

interface DiagramProps {
  spec: DiagramSpec | undefined;
  rate: Rate;
  nested?: boolean;
  constrain?: boolean;
}

export default function Diagram({ spec, rate, nested, constrain }: DiagramProps) {
  const C = useC();
  const zones = useZones();
  if (!spec) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const R = (v: any): any =>
    v && typeof v === "object" && !Array.isArray(v) ? (v[rate] !== undefined ? v[rate] : v.all) : v;

  const caption = spec.captionByRate
    ? ((spec.captionByRate as Record<string, string>)[rate] !== undefined
        ? (spec.captionByRate as Record<string, string>)[rate]
        : (spec.caption as string))
    : (spec.caption as string);

  if (spec.type === "compare") {
    const s = spec as unknown as { labels: string[]; a: DiagramSpec; b: DiagramSpec; title?: string };
    const render = (con: boolean) => (
      <div>
        <div style={{ fontFamily: C.mono, fontSize: 11, color: C.dim, margin: "0 0 4px" }}>{s.labels[0]}</div>
        <Diagram spec={s.a} rate={rate} nested constrain={con} />
        <div style={{ fontFamily: C.mono, fontSize: 11, color: C.signal, margin: "14px 0 4px" }}>{s.labels[1]}</div>
        <Diagram spec={s.b} rate={rate} nested constrain={con} />
      </div>
    );
    if (nested) return <>{render(constrain !== false)}</>;
    return <Figure title={s.title} caption={caption} render={render} />;
  }

  const W = 700,
    X0 = 26,
    SPAN = 648;
  let H = 150;
  const g: React.ReactNode[] = [];

  /* ------------------------------------------------------------- bitfield */
  if (spec.type === "bitfield") {
    const fields = spec.fields as Array<{ label: string; w: number; accent?: boolean; alt?: boolean; note?: string }>;
    const total = fields.reduce((a, f) => a + f.w, 0);
    const compact = spec.compact as boolean | undefined;
    const y = spec.ruler ? 46 : 26,
      bh = compact ? 34 : 48;
    let x = X0;

    if (spec.ruler) {
      g.push(<line key="rl" x1={X0} y1={y - 12} x2={X0 + SPAN} y2={y - 12} stroke={C.ruleSoft} strokeWidth="0.8" />);
      let acc = 0;
      fields.forEach((f, i) => {
        const px = X0 + (acc / total) * SPAN;
        g.push(<line key={"rt" + i} x1={px} y1={y - 16} x2={px} y2={y - 8} stroke={C.rule} strokeWidth="0.8" />);
        if (i === 0 || (f.w / total) * SPAN > 40)
          g.push(<text key={"rx" + i} x={px + 3} y={y - 19} fill={C.faint} fontSize="10" fontFamily={C.mono}>{acc}</text>);
        acc += f.w;
      });
      g.push(<text key="rend" x={X0 + SPAN} y={y - 19} textAnchor="end" fill={C.dim} fontSize="10.5" fontFamily={C.mono}>{total + " bits"}</text>);
    }

    let noteBelow = false;
    fields.forEach((f, i) => {
      const w = (f.w / total) * SPAN;
      const fill = f.accent ? C.signalWash : f.alt ? C.altFill : C.ink3;
      const stroke = f.accent ? C.signal : f.alt ? C.altStroke : C.rule;
      g.push(<rect key={"r" + i} x={x} y={y} width={Math.max(w - 1.5, 1)} height={bh} rx={2} fill={fill} stroke={stroke} strokeWidth="1" />);
      if (w > 44) {
        const noteW = f.note ? estWidth(f.note, 10, true) : 0;
        const noteInside = !!f.note && !compact && noteW <= w - 8;
        g.push(<text key={"t" + i} x={x + w / 2} y={y + (noteInside ? bh / 2 : bh / 2 + 4)} textAnchor="middle"
          fill={f.accent ? C.signal : C.dim} fontSize="11" fontFamily={C.mono}
          {...fitProps(f.label, 11, w - 8, true)}>{f.label}</text>);
        if (f.note && !compact) {
          if (noteInside) {
            g.push(<text key={"n" + i} x={x + w / 2} y={y + bh / 2 + 15} textAnchor="middle" fill={C.faint} fontSize="10" fontFamily={C.mono}>{f.note}</text>);
          } else {
            /* too wide to sit inside: drop below with a leader, left-aligned, clamped in-bounds */
            noteBelow = true;
            const nx = Math.min(Math.max(X0, x), X0 + SPAN - noteW);
            const ny = y + bh + 26;
            g.push(<line key={"nl" + i} x1={x + w / 2} y1={y + bh + 2} x2={x + w / 2} y2={ny - 9} stroke={C.rule} strokeWidth="0.7" />);
            g.push(<line key={"nl2" + i} x1={x + w / 2} y1={ny - 9} x2={nx + 3} y2={ny - 9} stroke={C.rule} strokeWidth="0.7" />);
            g.push(<text key={"n" + i} x={nx} y={ny} fill={C.faint} fontSize="10" fontFamily={C.mono}>{f.note}</text>);
          }
        }
      } else {
        const ly = i % 2 === 0 ? y + bh + 17 : y + bh + 32;
        g.push(<line key={"l" + i} x1={x + w / 2} y1={y + bh + 2} x2={x + w / 2} y2={ly - 9} stroke={C.rule} strokeWidth="0.7" />);
        g.push(<text key={"t" + i} x={x + w / 2} y={ly} textAnchor="middle"
          fill={f.accent ? C.signal : C.faint} fontSize="10.5" fontFamily={C.mono}
          {...fitProps(f.label, 10.5, Math.max(w + 40, 60), true)}>{f.label}</text>);
      }
      x += w;
    });
    H = (spec.ruler ? 46 : 26) + (compact ? 34 : 48) + (noteBelow ? 48 : 44);
  }

  /* -------------------------------------------------------------- symbols */
  if (spec.type === "symbols") {
    const n = R(spec.n) || 24;
    const dam = (spec.damaged as number[]) || [];
    const parityFrom = spec.parityFrom as number | undefined;
    const cw = SPAN / n;
    const y = 44,
      bh = 44;
    for (let i = 0; i < n; i++) {
      const isDam = dam.indexOf(i) >= 0;
      const isPar = parityFrom !== undefined && i >= parityFrom;
      g.push(<rect key={i} x={X0 + i * cw} y={y} width={cw - 2} height={bh} rx={1.5}
        fill={isDam ? C.badWash : isPar ? C.signalWash : C.ink3}
        stroke={isDam ? C.bad : isPar ? C.signal : C.rule} strokeWidth={isDam ? 1.3 : 0.9} />);
      if (isDam) g.push(<text key={"x" + i} x={X0 + i * cw + (cw - 2) / 2} y={y + bh / 2 + 4}
        textAnchor="middle" fill={C.bad} fontSize="11" fontFamily={C.mono}>{"×"}</text>);
      if (i % 4 === 0) g.push(<text key={"i" + i} x={X0 + i * cw + 2} y={y - 6} fill={C.faint} fontSize="10" fontFamily={C.mono}>{i}</text>);
    }
    if (parityFrom !== undefined) {
      g.push(<line key="pd" x1={X0 + parityFrom * cw - 1} y1={y - 2} x2={X0 + parityFrom * cw - 1} y2={y + bh + 2} stroke={C.signal} strokeWidth="1.2" />);
      g.push(<text key="pt" x={X0 + parityFrom * cw + 4} y={y + bh + 16} fill={C.signal} fontSize="10" fontFamily={C.mono}>30 parity</text>);
      g.push(<text key="mt" x={X0} y={y + bh + 16} fill={C.dim} fontSize="10" fontFamily={C.mono}>514 message</text>);
    }
    if (spec.unit)
      g.push(<text key="ut" x={X0} y={y + bh + 16} fill={C.faint} fontSize="10" fontFamily={C.mono}>{spec.unit as string}</text>);

    /* the fifteen-symbol budget, drawn as a meter */
    if (spec.budget) {
      const my = y + bh + 26,
        mw = 13,
        used = dam.length;
      for (let k = 0; k < 15; k++) {
        g.push(<rect key={"m" + k} x={X0 + k * (mw + 3)} y={my} width={mw} height={10} rx={1.5}
          fill={k < used ? (used > 15 ? C.bad : C.signal) : "transparent"}
          stroke={k < used ? (used > 15 ? C.bad : C.signal) : C.rule} strokeWidth="0.9" />);
      }
      g.push(<text key="mtx" x={X0 + 15 * (mw + 3) + 10} y={my + 9} fill={used > 15 ? C.bad : C.good} fontSize="11" fontFamily={C.mono}>
        {used > 15 ? used + " damaged, 15 correctable - codeword lost" : used + " of 15 spent"}</text>);
      H = my + 34;
    } else {
      H = y + bh + 34;
    }
    if (spec.scale)
      g.push(<text key="sc" x={X0 + SPAN} y={y - 6} textAnchor="end" fill={C.faint} fontSize="10" fontFamily={C.mono}>
        {"1 cell = " + spec.scale + " symbols"}</text>);
  }

  /* ---------------------------------------------------------------- lanes */
  if (spec.type === "lanes") {
    const n = R(spec.n) || 8;
    const fail = (spec.fail as number[]) || [];
    const rh = Math.max(9, Math.min(17, Math.floor(190 / n)));
    const order = spec.shuffled ? shuffleOrder(n) : null;
    /* leave room on the right for per-lane annotations so they never spill the viewBox */
    const hasRightText = !!order || fail.length > 0;
    const top = 30,
      LX = 96,
      LW = hasRightText ? 452 : 540;
    for (let i = 0; i < n; i++) {
      const y = top + i * (rh + 3);
      const bad = fail.indexOf(i) >= 0;
      g.push(<rect key={"b" + i} x={LX} y={y} width={LW} height={rh} rx={1.5}
        fill={bad ? C.badWash : i % 2 ? C.ink3 : C.ink2}
        stroke={bad ? C.bad : C.rule} strokeWidth={bad ? 1.2 : 0.7} />);
      if (spec.mapping) {
        /* round-robin: lane i carries units i, i+n, i+2n ... */
        for (let k = 0; k < 6; k++) {
          const unit = i + k * n;
          const cx = LX + 6 + k * 88;
          g.push(<rect key={"u" + i + "_" + k} x={cx} y={y + 1.5} width={46} height={rh - 3} rx={1.5}
            fill={C.signalWash} stroke={C.signalDim} strokeWidth="0.7" />);
          if (rh >= 12)
            g.push(<text key={"ut" + i + "_" + k} x={cx + 23} y={y + rh - 4} textAnchor="middle"
              fill={C.signal} fontSize="10" fontFamily={C.mono}>{unit}</text>);
        }
      }
      const label = order ? "phys " + i : "lane " + i;
      g.push(<text key={"t" + i} x={LX - 8} y={y + rh - 2} textAnchor="end" fill={bad ? C.bad : C.faint} fontSize="10" fontFamily={C.mono}>{label}</text>);
      if (order)
        g.push(<text key={"o" + i} x={LX + LW + 8} y={y + rh - 2} fill={C.signal} fontSize="10" fontFamily={C.mono}>{"carries logical " + order[i]}</text>);
      if (bad)
        g.push(<text key={"f" + i} x={LX + LW + 8} y={y + rh - 2} fill={C.bad} fontSize="10" fontFamily={C.mono}>no lock</text>);
    }
    H = top + n * (rh + 3) + 20;
  }

  /* ----------------------------------------------------------------- fold */
  if (spec.type === "fold") {
    const lg = R(spec.logical),
      ph = R(spec.physical);
    const top = 34,
      rh = Math.max(8, Math.min(14, Math.floor(150 / lg)));
    const LX = 90,
      LW = 190,
      PX = 430,
      PW = 190;
    const per = lg / ph;
    for (let i = 0; i < lg; i++) {
      const y = top + i * (rh + 3);
      g.push(<rect key={"l" + i} x={LX} y={y} width={LW} height={rh} rx={1.5} fill={C.ink3} stroke={C.rule} strokeWidth="0.7" />);
    }
    const phh = (lg * (rh + 3)) / ph - 3;
    for (let j = 0; j < ph; j++) {
      const y = top + j * (phh + 3);
      g.push(<rect key={"p" + j} x={PX} y={y} width={PW} height={phh} rx={2} fill={C.signalWash} stroke={C.signal} strokeWidth="0.9" />);
      g.push(<text key={"pt" + j} x={PX + PW + 8} y={y + phh / 2 + 3} fill={C.signal} fontSize="10" fontFamily={C.mono}>{"phys " + j}</text>);
      for (let k = 0; k < per; k++) {
        const li = j * per + k;
        const ly = top + li * (rh + 3) + rh / 2;
        g.push(<line key={"c" + j + "_" + k} x1={LX + LW + 2} y1={ly} x2={PX - 2} y2={y + phh / 2}
          stroke={C.signalDim} strokeWidth="0.7" />);
      }
    }
    g.push(<text key="ll" x={LX} y={top - 10} fill={C.dim} fontSize="10" fontFamily={C.mono}>{lg + " logical lanes"}</text>);
    g.push(<text key="pl" x={PX} y={top - 10} fill={C.signal} fontSize="10" fontFamily={C.mono}>{ph + " physical lanes"}</text>);
    g.push(<text key="rl" x={LX} y={top + lg * (rh + 3) + 16} fill={C.faint} fontSize="10.5" fontFamily={C.mono}>{lg + " / " + ph + " = " + lg / ph + " logical lanes per physical lane"}</text>);
    H = top + lg * (rh + 3) + 30;
  }

  /* ----------------------------------------------------------------- skew */
  if (spec.type === "skew") {
    const n = 6,
      off = [0, 34, 12, 58, 22, 44];
    const rh = 16,
      top = 46,
      BASE = 150;
    for (let i = 0; i < n; i++) {
      const y = top + i * (rh + 9);
      g.push(<rect key={"b" + i} x={BASE + off[i]} y={y} width={400} height={rh} rx={2} fill={C.ink3} stroke={C.rule} strokeWidth="0.8" />);
      g.push(<rect key={"m" + i} x={BASE + off[i]} y={y} width={26} height={rh} rx={2} fill={C.signalWash} stroke={C.signal} strokeWidth="1" />);
      g.push(<text key={"t" + i} x={BASE - 46} y={y + rh - 3} textAnchor="end" fill={C.faint} fontSize="10.5" fontFamily={C.mono}>{"lane " + i}</text>);
      g.push(<text key={"o" + i} x={BASE - 8} y={y + rh - 3} textAnchor="end" fill={off[i] ? C.signal : C.good} fontSize="10.5" fontFamily={C.mono}>
        {off[i] ? "+" + off[i] : "ref"}</text>);
      if (spec.showBuffer && off[i] > 0) {
        g.push(<line key={"d" + i} x1={BASE} y1={y + rh / 2} x2={BASE + off[i]} y2={y + rh / 2} stroke={C.signalDim} strokeWidth="1" strokeDasharray="2 3" />);
      }
    }
    g.push(<line key="ref" x1={BASE} y1={top - 10} x2={BASE} y2={top + n * (rh + 9)} stroke={C.signal} strokeWidth="1" strokeDasharray="3 3" />);
    g.push(<text key="rt" x={BASE + 4} y={top - 16} fill={C.signal} fontSize="10" fontFamily={C.mono}>markers should be simultaneous here</text>);
    g.push(<text key="ax" x={BASE - 8} y={top - 16} textAnchor="end" fill={C.faint} fontSize="10" fontFamily={C.mono}>offset</text>);
    if (spec.showBuffer)
      g.push(<text key="bt" x={BASE} y={top + n * (rh + 9) + 18} fill={C.faint} fontSize="10.5" fontFamily={C.mono}>dashed span is the delay each lane must be held by</text>);
    H = top + n * (rh + 9) + 30;
  }

  /* --------------------------------------------------------------- states */
  if (spec.type === "states") {
    const nodes = spec.nodes as string[];
    const gapx = 24;
    const bw = Math.min(150, (SPAN - (nodes.length - 1) * gapx) / nodes.length);
    const y = 40,
      bh = 46;
    nodes.forEach((s, i) => {
      const x = X0 + i * (bw + gapx);
      const last = i === nodes.length - 1;
      g.push(<rect key={"r" + i} x={x} y={y} width={bw} height={bh} rx={4}
        fill={last ? C.signalWash : C.ink3} stroke={last ? C.signal : C.rule} strokeWidth="1" />);
      const words = s.split(" ");
      const mid = Math.ceil(words.length / 2);
      const l1 = words.length > 2 ? words.slice(0, mid).join(" ") : s;
      const l2 = words.length > 2 ? words.slice(mid).join(" ") : "";
      g.push(<text key={"t" + i} x={x + bw / 2} y={y + (l2 ? 20 : 27)} textAnchor="middle" fill={last ? C.signal : C.text} fontSize="11">{l1}</text>);
      if (l2) g.push(<text key={"t2" + i} x={x + bw / 2} y={y + 34} textAnchor="middle" fill={last ? C.signal : C.text} fontSize="11">{l2}</text>);
      if (!last) {
        g.push(<line key={"l" + i} x1={x + bw + 3} y1={y + bh / 2} x2={x + bw + gapx - 7} y2={y + bh / 2} stroke={C.rule} strokeWidth="1" />);
        g.push(<polygon key={"a" + i} points={x + bw + gapx - 7 + "," + (y + bh / 2 - 4) + " " + (x + bw + gapx - 7) + "," + (y + bh / 2 + 4) + " " + (x + bw + gapx - 1) + "," + (y + bh / 2)} fill={C.rule} />);
      }
    });
    if (spec.loop) {
      const loop = spec.loop as [number, number];
      const from = X0 + loop[0] * (bw + gapx) + bw / 2;
      const to = X0 + loop[1] * (bw + gapx) + bw / 2;
      const ly = y + bh + 26;
      g.push(<path key="lp" d={"M " + from + " " + (y + bh) + " L " + from + " " + ly + " L " + to + " " + ly + " L " + to + " " + (y + bh + 6)}
        stroke={C.bad} strokeWidth="1.1" fill="none" />);
      g.push(<polygon key="lph" points={to - 4 + "," + (y + bh + 8) + " " + (to + 4) + "," + (y + bh + 8) + " " + to + "," + (y + bh)} fill={C.bad} />);
      if (spec.loopLabel)
        g.push(<text key="lpt" x={(from + to) / 2} y={ly + 14} textAnchor="middle" fill={C.bad} fontSize="10" fontFamily={C.mono}>{spec.loopLabel as string}</text>);
      H = ly + 28;
    } else {
      H = y + bh + 26;
    }
  }

  /* ------------------------------------------------------------------ eye */
  if (spec.type === "eye") {
    const levels = [44, 84, 124, 164];
    const L = 120,
      Rt = 600;
    levels.forEach((y, i) => {
      g.push(<line key={"lv" + i} x1={60} y1={y} x2={650} y2={y} stroke={C.ruleSoft} strokeWidth="0.8" strokeDasharray="2 5" />);
      g.push(<text key={"lt" + i} x={52} y={y + 4} textAnchor="end" fill={C.faint} fontSize="10" fontFamily={C.mono}>{3 - i}</text>);
    });
    for (let i = 0; i < 3; i++) {
      const top = levels[i],
        bot = levels[i + 1];
      const cy = (top + bot) / 2,
        ry = (bot - top) / 2 - 5;
      g.push(<ellipse key={"e" + i} cx={(L + Rt) / 2} cy={cy} rx={(Rt - L) / 2} ry={ry}
        fill="none" stroke={C.signal} strokeWidth="1.5" />);
    }
    g.push(<line key="ul" x1={L} y1={34} x2={L} y2={176} stroke={C.rule} strokeWidth="0.8" />);
    g.push(<line key="ur" x1={Rt} y1={34} x2={Rt} y2={176} stroke={C.rule} strokeWidth="0.8" />);
    g.push(<text key="ut" x={(L + Rt) / 2} y={28} textAnchor="middle" fill={C.faint} fontSize="10" fontFamily={C.mono}>one unit interval</text>);
    if (spec.windows) {
      [0.45, 0.55].forEach((u, i) => {
        const x = L + u * (Rt - L);
        g.push(<line key={"w" + i} x1={x} y1={34} x2={x} y2={176} stroke={C.bad} strokeWidth="1.2" strokeDasharray="3 3" />);
        g.push(<text key={"wt" + i} x={x} y={i === 0 ? 194 : 206} textAnchor="middle" fill={C.bad} fontSize="10" fontFamily={C.mono}>{u + " UI"}</text>);
      });
      g.push(<text key="wl" x={Rt + 16} y={108} fill={C.bad} fontSize="10" fontFamily={C.mono}>histograms</text>);
    }
    H = spec.windows ? 216 : 190;
  }

  /* ---------------------------------------------------------------- curve */
  if (spec.type === "curve") {
    const L = 96,
      Rt = 620,
      T = 34,
      B = 196;
    const decades = ["1e-13", "1e-11", "1e-9", "1e-7", "1e-5", "1e-3"];
    decades.forEach((d, i) => {
      const y = T + ((B - T) / (decades.length - 1)) * i;
      g.push(<line key={"gl" + i} x1={L} y1={y} x2={Rt} y2={y} stroke={C.ruleSoft} strokeWidth="0.7" strokeDasharray="2 5" />);
      g.push(<text key={"gt" + i} x={L - 8} y={y + 3.5} textAnchor="end" fill={C.faint} fontSize="10" fontFamily={C.mono}>{d}</text>);
    });
    g.push(<line key="ax" x1={L} y1={B} x2={Rt} y2={B} stroke={C.rule} strokeWidth="1" />);
    g.push(<line key="ay" x1={L} y1={T} x2={L} y2={B} stroke={C.rule} strokeWidth="1" />);

    let d = "";
    const pts = 70;
    for (let i = 0; i <= pts; i++) {
      const t = i / pts;
      const x = L + t * (Rt - L);
      const k = 1 / (1 + Math.exp(-(t - 0.66) * 30));
      const yy = T + 6 + (1 - k) * (B - T - 14);
      d += (i === 0 ? "M " : " L ") + x.toFixed(1) + " " + yy.toFixed(1);
    }
    g.push(<path key="c" d={d} stroke={C.signal} strokeWidth="1.9" fill="none" />);

    const cliffX = L + 0.66 * (Rt - L);
    const opX = L + 0.42 * (Rt - L);
    g.push(<line key="cl" x1={cliffX} y1={T} x2={cliffX} y2={B} stroke={C.bad} strokeWidth="1" strokeDasharray="3 3" />);
    g.push(<text key="ct" x={cliffX + 6} y={T + 12} fill={C.bad} fontSize="10.5" fontFamily={C.mono}>the cliff</text>);
    g.push(<circle key="op" cx={opX} cy={T + 10} r={4} fill={C.good} />);
    g.push(<text key="opt" x={opX - 8} y={T + 13} textAnchor="end" fill={C.good} fontSize="10" fontFamily={C.mono}>operating point</text>);
    g.push(<line key="mg" x1={opX + 8} y1={T + 24} x2={cliffX - 3} y2={T + 24} stroke={C.good} strokeWidth="0.9" />);
    g.push(<text key="mgt" x={(opX + cliffX) / 2} y={T + 38} textAnchor="middle" fill={C.good} fontSize="10.5" fontFamily={C.mono}>margin lives here, measured pre-FEC</text>);
    g.push(<text key="xl" x={Rt} y={B + 20} textAnchor="end" fill={C.faint} fontSize="10.5" fontFamily={C.mono}>pre-FEC BER, worsening to the right</text>);
    g.push(<text key="yl" x={L - 8} y={T - 12} textAnchor="end" fill={C.dim} fontSize="10.5" fontFamily={C.mono}>post-FEC BER</text>);
    H = 224;
  }

  /* ----------------------------------------------------------------- wave */
  if (spec.type === "wave") {
    const bits: number[] = [];
    if (spec.pattern === "runs") {
      const runs = [12, 9, 11, 8, 10];
      let v = 1;
      runs.forEach((r) => {
        for (let i = 0; i < r; i++) bits.push(v);
        v = v ? 0 : 1;
      });
    } else {
      const prand = (i: number) => {
        const x = Math.sin(i * 12.9898) * 43758.5453;
        return x - Math.floor(x);
      };
      for (let i = 0; i < 50; i++) bits.push(prand(i * 7.3) > 0.5 ? 1 : 0);
    }
    const hi = 40,
      lo = 86,
      bw = SPAN / bits.length;
    let d = "M " + X0 + " " + (bits[0] ? hi : lo);
    let trans = 0;
    bits.forEach((b, i) => {
      const x1 = X0 + (i + 1) * bw;
      d += " L " + x1 + " " + (b ? hi : lo);
      if (i < bits.length - 1 && bits[i + 1] !== b) {
        d += " L " + x1 + " " + (bits[i + 1] ? hi : lo);
        trans++;
      }
    });
    g.push(<line key="h" x1={X0} y1={hi} x2={X0 + SPAN} y2={hi} stroke={C.ruleSoft} strokeWidth="0.7" strokeDasharray="2 5" />);
    g.push(<line key="l" x1={X0} y1={lo} x2={X0 + SPAN} y2={lo} stroke={C.ruleSoft} strokeWidth="0.7" strokeDasharray="2 5" />);
    g.push(<path key="w" d={d} stroke={spec.pattern === "runs" ? C.dim : C.signal} strokeWidth="1.7" fill="none" />);
    g.push(<text key="t" x={X0} y={112} fill={spec.pattern === "runs" ? C.bad : C.good} fontSize="10" fontFamily={C.mono}>
      {trans + " transitions in " + bits.length + " bit periods"}</text>);
    H = 126;
  }

  /* ---------------------------------------------------------------- spans */
  if (spec.type === "spans") {
    const segs = [
      { label: "host electrical", w: 1 },
      { label: "optical channel", w: 1.6 },
      { label: "far-end electrical", w: 1 },
    ];
    const optZone = zones.signal;
    const total = segs.reduce((a, s) => a + s.w, 0);
    const top = 40,
      sh = 40;
    let x = X0;
    segs.forEach((s, i) => {
      const w = (s.w / total) * SPAN;
      g.push(<rect key={"s" + i} x={x} y={top} width={w - 3} height={sh} rx={3}
        fill={i === 1 ? optZone.fill : C.ink3} stroke={i === 1 ? optZone.hue : C.rule} strokeWidth="1" />);
      g.push(<text key={"st" + i} x={x + w / 2} y={top + 25} textAnchor="middle" fill={C.dim} fontSize="11">{s.label}</text>);
      x += w;
    });

    const iy = top + sh + 16,
      oy = iy + 26;
    if (spec.mode === "concatenated") {
      const ox = (segs[0].w / total) * SPAN;
      const ow = (segs[1].w / total) * SPAN;
      g.push(<rect key="in" x={X0 + ox} y={iy} width={ow - 3} height={14} rx={3} fill={C.signalWash} stroke={C.signal} strokeWidth="1" />);
      g.push(<text key="int" x={X0 + ox + ow / 2} y={iy + 11} textAnchor="middle" fill={C.signal} fontSize="10.5" fontFamily={C.mono}>inner code</text>);
      g.push(<rect key="out" x={X0} y={oy} width={SPAN - 3} height={14} rx={3} fill={C.altFill} stroke={C.altStroke} strokeWidth="1" />);
      g.push(<text key="outt" x={X0 + SPAN / 2} y={oy + 11} textAnchor="middle" fill={C.dim} fontSize="10.5" fontFamily={C.mono}>outer Reed-Solomon, end to end</text>);
    } else {
      let sx = X0;
      segs.forEach((s, i) => {
        const w = (s.w / total) * SPAN;
        g.push(<rect key={"sg" + i} x={sx} y={iy} width={w - 3} height={14} rx={3} fill={C.signalWash} stroke={C.signal} strokeWidth="1" />);
        g.push(<text key={"sgt" + i} x={sx + w / 2} y={iy + 11} textAnchor="middle" fill={C.signal} fontSize="10.5" fontFamily={C.mono}>corrected here</text>);
        if (i < segs.length - 1)
          g.push(<text key={"re" + i} x={sx + w - 3} y={oy + 11} textAnchor="middle" fill={C.bad} fontSize="10.5" fontFamily={C.mono}>re-encoded</text>);
        sx += w;
      });
    }
    H = oy + 30;
  }

  const render = (con: boolean) => (
    <svg
      viewBox={"0 0 " + W + " " + H}
      className={con === false ? undefined : "svg-canvas"}
      style={con === false ? { width: "100%", height: "auto", display: "block" } : undefined}
    >
      {g}
    </svg>
  );

  if (nested) return render(constrain !== false);

  return <Figure title={spec.title as string | undefined} caption={caption} render={render} />;
}
