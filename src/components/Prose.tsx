import React, { useState } from "react";

/* Split a run of text into React nodes, honouring [[term]] links, **bold** and `code`. */
function inlineNodes(
  text: string,
  terms: Record<string, string> | undefined,
  open: string | null,
  setOpen: (s: string | null) => void,
  keyPrefix: string,
): React.ReactNode[] {
  const parts = text.split(/(\[\[[^\]]+\]\]|\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((b, i) => {
    const key = keyPrefix + "-" + i;
    let m: RegExpMatchArray | null;
    if ((m = b.match(/^\[\[([^\]]+)\]\]$/))) {
      const t = m[1];
      if (terms && terms[t]) {
        return (
          <button key={key} className="term" data-open={open === t} onClick={() => setOpen(open === t ? null : t)}>
            {t}
          </button>
        );
      }
      return <span key={key}>{t}</span>;
    }
    if ((m = b.match(/^\*\*([^*]+)\*\*$/))) return <strong key={key}>{m[1]}</strong>;
    if ((m = b.match(/^`([^`]+)`$/))) return (
      <code key={key} className="inline-code">
        {m[1]}
      </code>
    );
    return <span key={key}>{b}</span>;
  });
}

export default function Prose({ text, terms }: { text?: string; terms?: Record<string, string> }) {
  const [open, setOpen] = useState<string | null>(null);
  const paras = (text || "").split("\n\n");
  return (
    <div className="prose">
      {paras.map((p, pi) => {
        const showDef = open !== null && new RegExp("\\[\\[" + escapeRe(open) + "\\]\\]").test(p);
        return (
          <div key={pi}>
            <p>{inlineNodes(p, terms, open, setOpen, "p" + pi)}</p>
            {showDef && open ? (
              <div className="term-def">
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--signal)", fontWeight: 600 }}>
                  {open}
                </span>
                <span>{"  -  "}</span>
                {inlineNodes(terms ? terms[open] : "", undefined, null, () => {}, "def" + pi)}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
