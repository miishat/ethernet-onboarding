// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import StageWorkspace from "../src/components/StageWorkspace";
import type { CompleteInspectorRun } from "../src/inspector/types";

const run = {
  snapshots: [{ stage: "pcs-lanes", unit: "bit", buffers: [{ id: "pcs-lanes", values: Array.from({ length: 500 }, (_, i) => i % 2) }], inputRefs: [], outputRefs: [], explanation: "Sixteen PCS lane bit streams.", referenceIds: ["fixture"] }],
  trace: [{ output: { stage: "pcs-lanes", bufferId: "pcs-lanes", start: 0, count: 500 }, relation: "copied", inputs: [{ stage: "fec", bufferId: "pcs-symbols", start: 0, count: 500 }] }], profileId: "400gbase-dr4-tx-reference-pma-v1", provenance: { labels: ["Experimental reference using candidate contracts", "Candidate IEEE source", "Independent local fixture", "Not IEEE verified or standards conformant"] },
  laneInspection: { pcsSymbols: [Array.from({ length: 500 }, (_, i) => i)], physicalBits: [[0]], physicalSourcePcsLane: [[0]], physicalStartAbsoluteBit: 0, physicalInitialPhase: 0, pam4: [[{ dibit: "00", normalizedLevel: -3 }] ] },
} as unknown as CompleteInspectorRun;

describe("stage workspace", () => {
  it("renders a bounded selected-stage window and reference provenance", () => {
    render(<StageWorkspace run={run} stage="pcs-lanes" />);
    expect(screen.getByRole("region", { name: "PCS lanes workspace" })).toBeTruthy();
    expect(screen.getByText(/Showing 1–32 of 500/)).toBeTruthy();
    expect(screen.getByText(/Experimental reference using candidate contracts/)).toBeTruthy();
    expect(screen.getByText(/0x000 · 0000000000/)).toBeTruthy();
  });

  it("opens the linked nonzero PMD lane and PAM4 window", async () => {
    const user = userEvent.setup();
    const focused = {
      ...run,
      snapshots: [
        { ...run.snapshots[0], stage: "physical-lanes", buffers: [{ id: "pmd-lanes", values: Array.from({ length: 4 * 96 }, (_, index) => index % 2) }] },
        { ...run.snapshots[0], stage: "pam4", unit: "pam4-symbol", buffers: [{ id: "pam4-levels", values: Array.from({ length: 4 * 48 }, () => 0) }] },
        { ...run.snapshots[0], stage: "fec", unit: "rs-symbol", buffers: [{ id: "pcs-symbols", values: Array.from({ length: 384 }, (_, index) => index) }] },
      ],
      laneInspection: {
        ...run.laneInspection,
        physicalBits: Array.from({ length: 4 }, () => Array.from({ length: 96 }, (_, index) => index % 2)),
        physicalSourcePcsLane: Array.from({ length: 4 }, () => Array.from({ length: 96 }, () => 0)),
        pam4: Array.from({ length: 4 }, () => Array.from({ length: 48 }, () => ({ dibit: "00" as const, normalizedLevel: -3 as const }))),
      },
      trace: [
        { output: { stage: "physical-lanes", bufferId: "pmd-lanes", start: 2 * 96 + 70, count: 1 }, relation: "copied" as const, precision: "exact" as const, inputs: [{ stage: "pcs-lanes", bufferId: "pcs-lanes", start: 0, count: 1 }] },
        { output: { stage: "pam4", bufferId: "pam4-levels", start: 2 * 48 + 35, count: 1 }, relation: "encoded" as const, precision: "exact" as const, inputs: [{ stage: "physical-lanes", bufferId: "pmd-lanes", start: 2 * 96 + 70, count: 2 }] },
        { output: { stage: "pcs-lanes", bufferId: "pcs-lanes", start: 0, count: 960 }, relation: "copied" as const, precision: "aggregate" as const, inputs: [{ stage: "fec", bufferId: "pcs-symbols", start: 0, count: 384 }] },
      ],
    } as unknown as CompleteInspectorRun;
    const selection = { stage: "pcs-lanes", bufferId: "pcs-lanes", start: 0, count: 1 } as const;
    const { rerender } = render(<StageWorkspace run={focused} stage="physical-lanes" selected={selection} />);
    const physicalSelect = screen.getAllByRole("combobox").at(-1)!;
    expect((physicalSelect as HTMLSelectElement).value).toBe("2");
    expect(screen.getByText(/Showing 65–96 of 96/)).toBeTruthy();
    expect(screen.getByText("Output bit 70").closest("button")?.dataset.linked).toBe("true");
    expect(screen.getByText("Output bit 72").closest("button")?.dataset.linked).toBeUndefined();
    await user.selectOptions(physicalSelect, "1");
    expect((physicalSelect as HTMLSelectElement).value).toBe("1");

    rerender(<StageWorkspace run={focused} stage="pam4" selected={{ stage: "physical-lanes", bufferId: "pmd-lanes", start: 2 * 96 + 70, count: 1 }} />);
    expect((screen.getAllByRole("combobox").at(-1) as HTMLSelectElement).value).toBe("2");
    expect(screen.getByText(/Showing 33–48 of 48/)).toBeTruthy();

    rerender(<StageWorkspace run={focused} stage="fec" selected={{ stage: "physical-lanes", bufferId: "pmd-lanes", start: 2 * 96 + 70, count: 1 }} />);
    expect(screen.getAllByText("0").find((element) => element.tagName === "CODE")?.closest("button")?.dataset.linked).toBeUndefined();
    expect(screen.getByText(/copied \(aggregate\)/)).toBeTruthy();
  });
});
