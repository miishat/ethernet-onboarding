import type { Dir } from "../types";
import { CORE, DATA } from "../data/stack";

/* short labels so the rail stays narrow */
const SHORT: Record<string, string> = {
  mac: "MAC",
  rs: "RS",
  pcs: "PCS",
  fec: "RS-FEC",
  pma: "PMA",
  pmd: "PMD",
  medium: "Medium",
};

export default function StepperMiniStack({ blockId, dir }: { blockId: string; dir: Dir }) {
  const order = dir === "rx" ? CORE.slice().reverse() : CORE;
  return (
    <nav className="ministack" aria-label="Position in the stack">
      <div className="ministack__cap">{dir === "rx" ? "Medium → MAC" : "MAC → Medium"}</div>
      <ol className="ministack__list">
        {order.map((id) => {
          const current = id === blockId;
          return (
            <li
              key={id}
              className={"ministack__block" + (current ? " is-current" : "")}
              aria-current={current ? "step" : undefined}
            >
              {SHORT[id] || DATA[id].name}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
