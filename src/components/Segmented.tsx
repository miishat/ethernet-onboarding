interface Opt<T extends string> {
  label: string;
  value: T;
}

export default function Segmented<T extends string>({
  options,
  value,
  onPick,
  ariaLabel,
}: {
  options: Opt<T>[];
  value: T;
  onPick: (v: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div className="seg" role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button key={o.value} onClick={() => onPick(o.value)} aria-pressed={o.value === value}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
