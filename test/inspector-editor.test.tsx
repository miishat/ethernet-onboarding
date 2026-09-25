// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { useState } from "react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import FrameEditor from "../src/components/FrameEditor";
import FrameInspector from "../src/components/FrameInspector";
import { DEFAULT_FRAME } from "../src/inspector/defaults";
import { buildMacFrame } from "../src/inspector/engine/mac";
import { parseFrame } from "../src/inspector/engine/validation";
import App from "../src/App";
import { ThemeProvider } from "../src/theme/ThemeContext";

afterEach(() => {
  cleanup();
  window.history.replaceState({}, "", "/");
});

function defaultMac() {
  const parsed = parseFrame(DEFAULT_FRAME);
  if (!parsed.ok) throw new Error("default frame must parse");
  return buildMacFrame(parsed.value);
}

function renderApp() {
  return render(<ThemeProvider><App /></ThemeProvider>);
}

describe("frame editor", () => {
  it("blocks invalid payload hex before applying the frame", async () => {
    const onApply = vi.fn();
    const user = userEvent.setup();
    render(<FrameEditor draft={{ ...DEFAULT_FRAME, payloadHex: "GG" }} onDraftChange={vi.fn()} onApply={onApply} />);

    await user.click(screen.getByRole("button", { name: "Apply frame" }));

    expect(onApply).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toMatch(/hex/i);
  });

  it("applies a valid edit and renders the updated FCS", async () => {
    const user = userEvent.setup();
    let current = { ...DEFAULT_FRAME, payloadHex: "0102" };
    const onApply = vi.fn();
    const { rerender } = render(
      <FrameEditor draft={current} onDraftChange={(draft) => { current = draft; }} onApply={onApply} />,
    );

    await user.click(screen.getByRole("button", { name: "Apply frame" }));
    expect(onApply).toHaveBeenCalledTimes(1);
    const input = onApply.mock.calls[0][0];
    const mac = buildMacFrame(input);
    rerender(<FrameInspector stage="mac" onStageChange={vi.fn()} onExit={vi.fn()} draft={current} onDraftChange={(draft) => { current = draft; }} mac={mac} onApply={onApply} />);

    expect(screen.getByText(new RegExp(Array.from(mac.fcs, (byte) => byte.toString(16).padStart(2, "0")).join(" "), "i"))).toBeTruthy();
  });
});

describe("frame inspector", () => {
  it("explains why an unsupported inspector context cannot apply an experimental run", () => {
    render(<FrameInspector
      stage="mac"
      onStageChange={vi.fn()}
      onExit={vi.fn()}
      draft={DEFAULT_FRAME}
      onDraftChange={vi.fn()}
      mac={defaultMac()}
      onApply={vi.fn()}
      calculationUnavailableReason="Experimental calculation is available only for 400G TX at 100G per lane."
    />);

    expect((screen.getByRole("button", { name: "Apply frame" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/400G TX at 100G per lane/)).toBeTruthy();
  });

  it("updates the displayed FCS only after applying an edited App frame", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole("button", { name: "Open Inspector Beta" }));
    const before = screen.getByRole("button", { name: /^FCS /i }).textContent;
    const payload = screen.getByRole("textbox", { name: /Payload hex/i });
    await user.clear(payload);
    await user.type(payload, "0102");
    await user.click(screen.getByRole("button", { name: "Apply frame" }));

    expect(screen.getByRole("button", { name: /^FCS /i }).textContent).not.toBe(before);
  });

  it("keeps a walkthrough PHY-stage inspector unavailable and returns to that walkthrough step", async () => {
    window.history.replaceState({}, "", "/?view=frame&step=5");
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole("button", { name: "Inspect this stage" }));

    expect(screen.getByRole("region", { name: "Unavailable calculation" }).textContent).toMatch(/Calculation not available yet/);
    expect(screen.queryByRole("region", { name: "Frame bytes" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Return to learning" }));
    expect(window.location.search).toContain("view=frame");
    expect(window.location.search).toContain("step=5");
  });

  it("preserves a walkthrough stage when the header opens the inspector", async () => {
    window.history.replaceState({}, "", "/?view=frame&step=5");
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole("button", { name: "Open Inspector Beta" }));

    expect(screen.getByRole("region", { name: "Unavailable calculation" }).textContent).toMatch(/Calculation not available yet/);
    await user.click(screen.getByRole("button", { name: "Return to learning" }));
    expect(window.location.search).toContain("view=frame");
    expect(window.location.search).toContain("step=5");
  });

  it("changes field details when payload and FCS bytes are selected", async () => {
    const user = userEvent.setup();
    render(<FrameInspector stage="mac" onStageChange={vi.fn()} onExit={vi.fn()} draft={DEFAULT_FRAME} onDraftChange={vi.fn()} mac={defaultMac()} onApply={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /payload/i }));
    expect(screen.getByRole("region", { name: "Field details" }).textContent).toMatch(/payload/i);
    await user.click(screen.getByRole("button", { name: /fcs/i }));
    expect(screen.getByRole("region", { name: "Field details" }).textContent).toMatch(/frame check sequence/i);
  });

  it("keeps a draft across exit and reentry", async () => {
    const user = userEvent.setup();
    function Host() {
      const [open, setOpen] = useState(true);
      const [draft, setDraft] = useState({ ...DEFAULT_FRAME });
      return open ? <FrameInspector stage="mac" onStageChange={vi.fn()} onExit={() => setOpen(false)} draft={draft} onDraftChange={setDraft} mac={defaultMac()} onApply={vi.fn()} />
        : <button type="button" onClick={() => setOpen(true)}>Reopen</button>;
    }
    render(<Host />);

    const payload = screen.getByRole("textbox", { name: /Payload hex/i });
    await user.clear(payload);
    await user.type(payload, "aabb");
    await user.click(screen.getByRole("button", { name: "Return to learning" }));
    await user.click(screen.getByRole("button", { name: "Reopen" }));

    expect((screen.getByRole("textbox", { name: /Payload hex/i }) as HTMLTextAreaElement).value).toBe("aabb");
  });
});
