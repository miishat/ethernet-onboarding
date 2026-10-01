import { useEffect, useMemo, useRef, useState } from "react";

/* Temporary review tool: delete this file and its import in main.tsx to remove. */

type Annotation = {
  id: string;
  createdAt: string;
  url: string;
  pageTitle: string;
  target: string | null;
  comment: string;
};

type Draft = { id: string | null; x: number; y: number; target: string | null; text: string };

const STORAGE_KEY = "ethernet-onboarding:annotations:v1";

function load(): Annotation[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function describe(el: Element): string {
  const labelled = el.closest("[aria-label]");
  const aria = labelled?.getAttribute("aria-label")?.trim();
  const named = el.closest("button, a, h1, h2, h3, h4, label, summary, th, td, li");
  const text = (named?.textContent || el.textContent || "").replace(/\s+/g, " ").trim();
  const pick = text || aria;
  if (pick) return pick.length > 90 ? pick.slice(0, 90) + "…" : pick;
  const cls = typeof el.className === "string" && el.className ? "." + el.className.split(" ")[0] : "";
  return `<${el.tagName.toLowerCase()}${cls}>`;
}

function currentUrl() {
  return window.location.pathname + window.location.search;
}

function goTo(url: string) {
  if (currentUrl() === url) return;
  window.history.pushState({ ethernetOnboarding: true }, "", url);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function groupByPage(items: Annotation[]) {
  const map = new Map<string, { title: string; url: string; items: Annotation[] }>();
  for (const item of items) {
    const group = map.get(item.url) ?? { title: item.pageTitle, url: item.url, items: [] };
    group.items.push(item);
    map.set(item.url, group);
  }
  return [...map.values()];
}

function toMarkdown(items: Annotation[]): string {
  const ordered = [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const lines = ["# Onboarding app review notes", ""];
  for (const group of groupByPage(ordered)) {
    lines.push(`## ${group.title}`, `\`${group.url}\``, "");
    for (const item of group.items) {
      const comment = item.comment.replace(/\n/g, "\n  ");
      lines.push(item.target ? `- **${item.target}**: ${comment}` : `- ${comment}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

function download(name: string, type: string, body: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AnnotationLayer() {
  const [items, setItems] = useState<Annotation[]>(load);
  const [panelOpen, setPanelOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [url, setUrl] = useState(currentUrl);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const hoverRef = useRef<Element | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Storage full or blocked; notes stay in memory until export.
    }
  }, [items]);

  // The app navigates with pushState, which fires no event, so poll the URL cheaply.
  useEffect(() => {
    const id = window.setInterval(() => setUrl(currentUrl()), 400);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!picking) return;
    const inOverlay = (el: EventTarget | null) => el instanceof Node && !!rootRef.current?.contains(el);
    const clearHover = () => {
      hoverRef.current?.classList.remove("eoa-hover");
      hoverRef.current = null;
    };
    const onOver = (e: MouseEvent) => {
      if (inOverlay(e.target) || !(e.target instanceof Element)) return clearHover();
      if (hoverRef.current === e.target) return;
      clearHover();
      e.target.classList.add("eoa-hover");
      hoverRef.current = e.target;
    };
    const swallow = (e: Event) => {
      if (inOverlay(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
    };
    const onClick = (e: MouseEvent) => {
      if (inOverlay(e.target) || !(e.target instanceof Element)) return;
      e.preventDefault();
      e.stopPropagation();
      clearHover();
      setPicking(false);
      setDraft({
        id: null,
        x: Math.max(8, Math.min(e.clientX, window.innerWidth - 336)),
        y: Math.max(8, Math.min(e.clientY + 12, window.innerHeight - 220)),
        target: describe(e.target),
        text: "",
      });
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      setPicking(false);
    };
    document.body.classList.add("eoa-picking");
    document.addEventListener("mouseover", onOver, true);
    document.addEventListener("pointerdown", swallow, true);
    document.addEventListener("mousedown", swallow, true);
    document.addEventListener("click", onClick, true);
    window.addEventListener("keydown", onKey, true);
    return () => {
      clearHover();
      document.body.classList.remove("eoa-picking");
      document.removeEventListener("mouseover", onOver, true);
      document.removeEventListener("pointerdown", swallow, true);
      document.removeEventListener("mousedown", swallow, true);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [picking]);

  // Alt+N starts picking an element without reaching for the toolbar.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.code === "KeyN") {
        e.preventDefault();
        setDraft(null);
        setPicking((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const save = () => {
    if (!draft) return;
    const comment = draft.text.trim();
    if (!comment) return setDraft(null);
    if (draft.id) {
      setItems((prev) => prev.map((item) => (item.id === draft.id ? { ...item, comment } : item)));
    } else {
      setItems((prev) => [
        {
          id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
          createdAt: new Date().toISOString(),
          url: currentUrl(),
          pageTitle: document.title,
          target: draft.target,
          comment,
        },
        ...prev,
      ]);
    }
    setDraft(null);
  };

  const pageNote = () => {
    setPicking(false);
    setDraft({ id: null, x: window.innerWidth - 420, y: 72, target: null, text: "" });
  };

  const edit = (item: Annotation) =>
    setDraft({ id: item.id, x: window.innerWidth - 420, y: 72, target: item.target, text: item.comment });

  const copy = async () => {
    const md = toMarkdown(items);
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      download("onboarding-review-notes.md", "text/markdown", md);
    }
  };

  const clearAll = () => {
    if (window.confirm(`Delete all ${items.length} notes? Export first if you need them.`)) setItems([]);
  };

  const groups = useMemo(() => groupByPage(items), [items]);
  const onPage = items.filter((item) => item.url === url).length;

  return (
    <div ref={rootRef} className="eoa-root">
      <style>{CSS}</style>

      {draft && (
        <div className="eoa-card eoa-draft" style={{ left: draft.x, top: draft.y }} role="dialog" aria-label="Review note">
          <div className="eoa-draft__target">{draft.target ?? "Whole page"}</div>
          <textarea
            autoFocus
            value={draft.text}
            placeholder="What should be reviewed here?"
            onChange={(e) => setDraft({ ...draft, text: e.target.value })}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Escape") setDraft(null);
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                save();
              }
            }}
          />
          <div className="eoa-row">
            <span className="eoa-hint">⌘/Ctrl+Enter to save</span>
            <button type="button" onClick={() => setDraft(null)}>Cancel</button>
            <button type="button" className="eoa-primary" onClick={save} disabled={!draft.text.trim()}>
              Save
            </button>
          </div>
        </div>
      )}

      {panelOpen && (
        <aside className="eoa-card eoa-panel" aria-label="Review notes">
          <header className="eoa-row eoa-panel__head">
            <strong>Review notes · {items.length}</strong>
            <button type="button" className="eoa-icon" onClick={() => setPanelOpen(false)} aria-label="Close notes">×</button>
          </header>
          <div className="eoa-row eoa-panel__tools">
            <button type="button" onClick={pageNote}>+ Note on this page</button>
            <button type="button" onClick={copy} disabled={!items.length}>{copied ? "Copied" : "Copy Markdown"}</button>
            <button type="button" onClick={() => download("onboarding-review-notes.json", "application/json", JSON.stringify(items, null, 2))} disabled={!items.length}>
              JSON
            </button>
            <button type="button" className="eoa-danger" onClick={clearAll} disabled={!items.length}>Clear</button>
          </div>
          <div className="eoa-panel__list">
            {!items.length && (
              <p className="eoa-empty">No notes yet. Press <b>Annotate</b> (or Alt+N), then click anything in the app.</p>
            )}
            {groups.map((group) => (
              <section key={group.url} className={"eoa-group" + (group.url === url ? " eoa-group--here" : "")}>
                <button type="button" className="eoa-link eoa-group__title" onClick={() => goTo(group.url)} title={group.url}>
                  {group.title}
                  {group.url === url ? <span className="eoa-here">you are here</span> : null}
                </button>
                {group.items.map((item) => (
                  <div key={item.id} className="eoa-item">
                    {item.target && <div className="eoa-item__target">{item.target}</div>}
                    <div className="eoa-item__comment">{item.comment}</div>
                    <div className="eoa-row eoa-item__meta">
                      <span>{new Date(item.createdAt).toLocaleString()}</span>
                      <button type="button" className="eoa-link" onClick={() => edit(item)}>Edit</button>
                      <button type="button" className="eoa-link" onClick={() => setItems((prev) => prev.filter((x) => x.id !== item.id))}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </section>
            ))}
          </div>
        </aside>
      )}

      <div className="eoa-toolbar">
        <button
          type="button"
          className={"eoa-pill" + (picking ? " eoa-pill--on" : "")}
          onClick={() => {
            setDraft(null);
            setPicking((v) => !v);
          }}
          title="Alt+N"
        >
          {picking ? "Click an element · Esc to cancel" : "Annotate"}
        </button>
        <button type="button" className={"eoa-pill" + (panelOpen ? " eoa-pill--on" : "")} onClick={() => setPanelOpen((v) => !v)}>
          Notes {items.length}
          {onPage ? <span className="eoa-badge">{onPage} here</span> : null}
        </button>
      </div>
    </div>
  );
}

const CSS = `
.eoa-root { position: fixed; inset: 0; pointer-events: none; z-index: 2147483000; font: 13px/1.45 Inter, system-ui, sans-serif; color: var(--text); }
.eoa-root button { font: inherit; color: inherit; cursor: pointer; }
.eoa-root button:disabled { opacity: .45; cursor: default; }
.eoa-card { position: fixed; pointer-events: auto; background: var(--ink2); border: 1px solid var(--rule); border-radius: 10px; box-shadow: var(--shadow); }
.eoa-row { display: flex; align-items: center; gap: 8px; }
.eoa-row button, .eoa-pill { background: var(--ink3); border: 1px solid var(--rule); border-radius: 6px; padding: 4px 10px; }
.eoa-row button:hover:not(:disabled), .eoa-pill:hover { border-color: var(--signal-dim); }
.eoa-primary { background: var(--signal) !important; color: var(--signal-ink) !important; border-color: var(--signal) !important; font-weight: 600; }
.eoa-danger { color: var(--bad) !important; }
.eoa-toolbar { position: fixed; right: 16px; bottom: 16px; display: flex; gap: 8px; pointer-events: auto; }
.eoa-pill { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 999px; box-shadow: var(--shadow); font-weight: 500; }
.eoa-pill--on { background: var(--signal-wash); border-color: var(--signal); color: var(--signal); }
.eoa-badge { background: var(--signal); color: var(--signal-ink); border-radius: 999px; padding: 0 7px; font-size: 11px; font-weight: 600; }
.eoa-draft { width: 320px; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
.eoa-draft__target { font-size: 12px; color: var(--signal); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.eoa-draft textarea { min-height: 88px; resize: vertical; background: var(--ink); color: var(--text); border: 1px solid var(--rule); border-radius: 6px; padding: 8px; font: inherit; }
.eoa-draft textarea:focus { outline: 2px solid var(--signal-dim); }
.eoa-hint { margin-right: auto; font-size: 11px; color: var(--faint); }
.eoa-panel { right: 16px; bottom: 64px; width: min(400px, calc(100vw - 32px)); max-height: calc(100vh - 96px); display: flex; flex-direction: column; }
.eoa-panel__head { justify-content: space-between; padding: 10px 12px; border-bottom: 1px solid var(--rule-soft); }
.eoa-panel__tools { flex-wrap: wrap; padding: 10px 12px; border-bottom: 1px solid var(--rule-soft); }
.eoa-panel__list { overflow-y: auto; padding: 4px 12px 12px; }
.eoa-icon { background: none !important; border: none !important; font-size: 18px !important; line-height: 1; padding: 0 4px !important; color: var(--dim) !important; }
.eoa-empty { color: var(--dim); margin: 12px 0; }
.eoa-group { padding: 10px 0; border-bottom: 1px solid var(--rule-soft); }
.eoa-group:last-child { border-bottom: none; }
.eoa-group__title { display: flex; align-items: center; gap: 8px; font-weight: 600; text-align: left; margin-bottom: 6px; }
.eoa-here { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; color: var(--signal); }
.eoa-link, .eoa-row button.eoa-link { background: none; border: none; padding: 0; color: var(--diagram) !important; }
.eoa-link:hover { text-decoration: underline; }
.eoa-item { padding: 6px 0 6px 10px; border-left: 2px solid var(--rule); margin: 6px 0; }
.eoa-group--here .eoa-item { border-left-color: var(--signal-dim); }
.eoa-item__target { font-size: 12px; color: var(--dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.eoa-item__comment { white-space: pre-wrap; margin: 2px 0 4px; }
.eoa-item__meta { font-size: 11px; color: var(--faint); }
.eoa-item__meta > span { margin-right: auto; }
body.eoa-picking, body.eoa-picking * { cursor: crosshair !important; }
body.eoa-picking .eoa-root, body.eoa-picking .eoa-root * { cursor: pointer !important; }
.eoa-hover { outline: 2px dashed var(--signal) !important; outline-offset: 2px; }
`;
