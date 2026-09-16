export default function ProgressMeter({ value, total }: { value: number; total: number }) {
  const r = 11;
  const circ = 2 * Math.PI * r;
  const frac = total > 0 ? Math.min(1, value / total) : 0;
  const offset = circ * (1 - frac);
  return (
    <div className="progress" role="progressbar" aria-label={"Learning progress: " + value + " of " + total} aria-valuenow={value} aria-valuemin={0} aria-valuemax={total}>
      <svg className="progress__ring" width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
        <circle className="progress__track" cx="14" cy="14" r={r} fill="none" strokeWidth="3" />
        <circle
          className="progress__value"
          cx="14"
          cy="14"
          r={r}
          fill="none"
          strokeWidth="3"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="progress__text">
        <b>{value}</b> / {total}
      </div>
    </div>
  );
}
