import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { Dir } from "../types";
import { searchTopics, visibleTopics, type TopicEntry } from "../search/topicCatalog";

interface Props {
  catalog: TopicEntry[];
  dir: Dir;
  recent: string[][];
  onSelect: (path: string[]) => void;
}

export default function TopicExplorer({ catalog, dir, recent, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [panelTop, setPanelTop] = useState(0);
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const panel = useRef<HTMLElement>(null);
  const results = useMemo(() => searchTopics(catalog, query, dir), [catalog, query, dir]);
  const blank = !query.trim();
  const groups = useMemo(() => {
    const grouped = new Map<string, TopicEntry[]>();
    for (const entry of results) {
      const group = grouped.get(entry.layer) || [];
      group.push(entry);
      grouped.set(entry.layer, group);
    }
    return [...grouped.values()];
  }, [results]);
  const recentEntries = useMemo(() => {
    const available = new Map(visibleTopics(catalog, dir).map((entry) => [entry.path.join("/"), entry]));
    return recent.flatMap((path) => {
      const entry = available.get(path.join("/"));
      return entry ? [entry] : [];
    });
  }, [catalog, dir, recent]);

  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const header = trigger.current?.closest("header");
    const measure = () => setPanelTop(Math.max(0, (header || trigger.current)?.getBoundingClientRect().bottom || 0) + 8);
    measure();
    input.current?.focus();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    if (header) observer?.observe(header);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        event.stopImmediatePropagation();
        setOpen(true);
        input.current?.focus();
      } else if (open && event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        close();
      } else if (open && panel.current?.contains(event.target as Node) &&
                 (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
        // Keep text editing and result navigation from advancing the frame walkthrough.
        event.stopImmediatePropagation();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open]);

  const select = (entry: TopicEntry) => {
    onSelect(entry.path);
    close();
    setQuery("");
  };

  const renderEntries = (entries: TopicEntry[]) => (
    <ul className="topic-explorer__list">
      {entries.map((entry) => (
        <li key={entry.path.join("/")}>
          <button className="topic-explorer__result" onClick={() => select(entry)}>
            <span className="topic-explorer__name">
              {entry.name}{!entry.written && <span className="tag">Outline</span>}
            </span>
            <span className="topic-explorer__breadcrumb">{entry.breadcrumb}</span>
            {entry.summary && <span className="topic-explorer__summary">{entry.summary}</span>}
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <div>
      <div className="control-label">Discover</div>
      <button ref={trigger} className="btn" aria-expanded={open} aria-controls="topic-explorer"
        aria-keyshortcuts="Control+k Meta+k" onClick={() => open ? close() : setOpen(true)}>
        Search Topics
      </button>
      <section ref={panel} id="topic-explorer" className="topic-explorer" hidden={!open}
        aria-labelledby="topic-explorer-heading" style={{ "--topic-panel-top": `${panelTop}px` } as CSSProperties}>
        <div className="topic-explorer__head">
          <h2 id="topic-explorer-heading">Search Topics</h2>
          <button className="btn" onClick={close}>Close search</button>
        </div>
        <label className="topic-explorer__label" htmlFor="topic-explorer-query">Find a topic, term, or clause</label>
        <input ref={input} id="topic-explorer-query" type="search" value={query}
          onChange={(event) => setQuery(event.target.value)} placeholder="Try PCS, Clause 119, or scrambler" />
        <p className="topic-explorer__count" role="status">
          {results.length} {results.length === 1 ? "topic" : "topics"} in {dir.toUpperCase()}
          {blank ? " · Complete index" : " · Search results"}
        </p>
        <div className="topic-explorer__scroll">
          {blank && recentEntries.length > 0 && (
            <section aria-labelledby="topic-explorer-recent">
              <h3 id="topic-explorer-recent">Recently viewed</h3>
              <button className="btn btn--ghost-signal topic-explorer__resume" onClick={() => select(recentEntries[0])}>
                Resume: {recentEntries[0].name}
              </button>
              {renderEntries(recentEntries)}
            </section>
          )}
          {results.length === 0 ? (
            <p className="topic-explorer__empty">No topics found. Try a topic name, glossary term, or clause number, or clear your search to browse the full index.</p>
          ) : blank ? groups.map((entries) => (
            <section key={entries[0].layer} aria-labelledby={`topic-layer-${entries[0].layer}`}>
              <h3 id={`topic-layer-${entries[0].layer}`}>{entries[0].layerName}</h3>
              {renderEntries(entries)}
            </section>
          )) : renderEntries(results)}
        </div>
      </section>
    </div>
  );
}
