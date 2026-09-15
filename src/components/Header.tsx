import type { Rate, Dir, LaneGen } from "../types";
import { RATES } from "../data/stack";
import Segmented from "./Segmented";
import ThemeToggle from "./ThemeToggle";
import ProgressMeter from "./ProgressMeter";

interface Props {
  rate: Rate;
  setRate: (r: Rate) => void;
  dir: Dir;
  setDir: (d: Dir) => void;
  gen: LaneGen;
  setGen: (g: LaneGen) => void;
  stepping: boolean;
  toggleStep: () => void;
  read: number;
  total: number;
}

export default function Header({ rate, setRate, dir, setDir, gen, setGen, stepping, toggleStep, read, total }: Props) {
  return (
    <header className="header">
      <div className="header__inner">
      <div className="header__title">
        <h1>
          <span className="header__logo" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7h13l-3-3M3 7l3 3" />
              <path d="M21 17H8l3 3M21 17l-3-3" />
            </svg>
          </span>
          Ethernet Onboarding
        </h1>
        <p className="header__sub">
          by Mishat · 400G, 800G and 1.6T, one sublayer at a time
          <span className="wip-tag">content review in progress</span>
        </p>
      </div>

      <div className="header__controls">
        <div>
          <div className="control-label">MAC data rate</div>
          <Segmented<Rate>
            options={RATES.map((r) => ({ label: r, value: r }))}
            value={rate}
            onPick={setRate}
            ariaLabel="MAC data rate"
          />
        </div>
        <div>
          <div className="control-label">Direction</div>
          <Segmented<Dir>
            options={[
              { label: "TX", value: "tx" },
              { label: "RX", value: "rx" },
            ]}
            value={dir}
            onPick={setDir}
            ariaLabel="Direction"
          />
        </div>
        <div>
          <div className="control-label">Per lane</div>
          <Segmented<LaneGen>
            options={[
              { label: "100G", value: "100" },
              { label: "200G", value: "200" },
            ]}
            value={gen}
            onPick={setGen}
            ariaLabel="Per-lane signalling rate"
          />
        </div>
        <div>
          <div className="control-label">Follow a frame</div>
          <button className="btn btn--ghost-signal" data-on={stepping} onClick={toggleStep}>
            {stepping ? "Close" : "Step through"}
          </button>
        </div>
        <div>
          <div className="control-label">Progress</div>
          <ProgressMeter value={read} total={total} />
        </div>
        <div>
          <div className="control-label">Theme</div>
          <ThemeToggle />
        </div>
      </div>
      </div>
    </header>
  );
}
