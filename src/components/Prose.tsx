import React, { useState } from "react";

const SUP: Record<string, string> = {
  "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4",
  "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9",
  "⁻": "-",
};

/* Turn runs of Unicode superscript characters into real <sup> so they render
   cleanly in any font (e.g. x⁵⁸ -> x<sup>58</sup>, 10⁻¹⁶ -> 10<sup>-16</sup>). */
function withSuperscripts(text: string, keyPrefix: string): React.ReactNode[] {
  const parts = text.split(/([⁰¹²³⁴-⁹⁻]+)/g);
  return parts.map((b, i) => {
    if (b && /^[⁰¹²³⁴-⁹⁻]+$/.test(b)) {
      const norm = b.split("").map((c) => SUP[c] || c).join("");
      return <sup key={keyPrefix + "s" + i}>{norm}</sup>;
    }
    return <React.Fragment key={keyPrefix + "t" + i}>{b}</React.Fragment>;
  });
}

/* Split a run of text into React nodes, honouring [[term]] links, **bold**, `code`
   and superscripts. */
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
    if ((m = b.match(/^\*\*([^*]+)\*\*$/))) return <strong key={key}>{withSuperscripts(m[1], key)}</strong>;
    if ((m = b.match(/^`([^`]+)`$/))) return (
      <code key={key} className="inline-code">
        {m[1]}
      </code>
    );
    return <span key={key}>{withSuperscripts(b, key)}</span>;
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
