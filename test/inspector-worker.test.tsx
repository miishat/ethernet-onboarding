// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useInspectorRun } from "../src/inspector/useInspectorRun";
import type { CompleteInspectorRun, RunInput } from "../src/inspector/types";

const input = {} as RunInput;
const run = { id: "new" } as CompleteInspectorRun;

class FakeWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
}

describe("useInspectorRun", () => {
  it("clears the previous run and ignores a stale result", () => {
    const worker = new FakeWorker();
    const { result } = renderHook(() => useInspectorRun(() => worker as unknown as Worker));
    act(() => result.current.apply(input));
    act(() => worker.onmessage?.({ data: { type: "result", requestId: 1, run } } as MessageEvent));
    expect(result.current.run).toBe(run);

    act(() => result.current.apply(input));
    expect(result.current.run).toBeNull();
    act(() => worker.onmessage?.({ data: { type: "result", requestId: 1, run } } as MessageEvent));
    expect(result.current.run).toBeNull();
    act(() => worker.onmessage?.({ data: { type: "result", requestId: 2, run } } as MessageEvent));
    expect(result.current.status).toBe("ready");
  });

  it("terminates its worker on unmount", () => {
    const worker = new FakeWorker();
    const { unmount } = renderHook(() => useInspectorRun(() => worker as unknown as Worker));
    unmount();
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
});
