import { useState } from "react";

export default function Prose({ text, terms }: { text?: string; terms?: Record<string, string> }) {
  const [open, setOpen] = useState<string | null>(null);
  const paras = (text || "").split("\n\n");
  return (
    <div className="prose">
      {paras.map((p, pi) => {
        const bits = p.split(/(\[\[[^\]]+\]\])/g);
        const showDef =
          open &&
          bits.some((b) => {
            const m = b.match(/^\[\[([^\]]+)\]\]$/);
            return m && m[1] === open;
          });
        return (
          <div key={pi}>
            <p>
              {bits.map((b, bi) => {
                const m = b.match(/^\[\[([^\]]+)\]\]$/);
                if (m && terms && terms[m[1]]) {
                  const key = m[1];
                  return (
                    <button
                      key={bi}
                      className="term"
                      data-open={open === key}
                      onClick={() => setOpen(open === key ? null : key)}
                    >
                      {key}
                    </button>
                  );
                }
                return <span key={bi}>{b}</span>;
              })}
            </p>
            {showDef && open ? (
              <div className="term-def">
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--signal)", fontWeight: 600 }}>
                  {open}
                </span>
                <span>{"  —  " + (terms ? terms[open] : "")}</span>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
