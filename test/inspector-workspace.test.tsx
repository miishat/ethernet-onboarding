// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import StageWorkspace from "../src/components/StageWorkspace";
import type { CompleteInspectorRun } from "../src/inspector/types";

const run = {
  snapshots: [{ stage: "pcs-lanes", unit: "bit", buffers: [{ id: "pcs-lanes", values: Array.from({ length: 500 }, (_, i) => i % 2) }], inputRefs: [], outputRefs: [], explanation: "Sixteen PCS lane bit streams.", referenceIds: ["fixture"] }],
  trace: [], profileId: "400gbase-dr4-tx-reference-pma-v1", provenance: { labels: ["Experimental reference using candidate contracts", "Candidate IEEE source", "Independent local fixture", "Not IEEE verified or standards conformant"] },
} as unknown as CompleteInspectorRun;

describe("stage workspace", () => {
  it("renders a bounded selected-stage window and reference provenance", () => {
    render(<StageWorkspace run={run} stage="pcs-lanes" />);
    expect(screen.getByRole("region", { name: "PCS lanes workspace" })).toBeTruthy();
    expect(screen.getByText(/Showing 1–64 of 500/)).toBeTruthy();
    expect(screen.getByText(/Experimental reference using candidate contracts/)).toBeTruthy();
    expect(document.querySelectorAll(".data-window__value")).toHaveLength(64);
  });
});
