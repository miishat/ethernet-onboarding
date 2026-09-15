export interface Crumb {
  label: string;
  go: (() => void) | null;
}

export default function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      {crumbs.map((c, i) => (
        <span key={i} style={{ display: "flex", gap: 7, alignItems: "center" }}>
          {i > 0 ? <span className="sep">/</span> : null}
          {c.go ? (
            <button onClick={c.go}>{c.label}</button>
          ) : (
            <span className="current">{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
