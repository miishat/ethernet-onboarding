// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useInspectorRun } from "../src/inspector/useInspectorRun";
import type { CompleteInspectorRun, RunInput } from "../src/inspector/types";

const input = {} as RunInput;
const firstInput = { id: "first" } as RunInput;
const secondInput = { id: "second" } as RunInput;
const firstRun = { id: "first" } as CompleteInspectorRun;
const secondRun = { id: "second" } as CompleteInspectorRun;

class FakeWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
}

describe("useInspectorRun", () => {
  it("keeps the newest distinct request when worker responses arrive out of order", () => {
    const worker = new FakeWorker();
    const { result } = renderHook(() => useInspectorRun(() => worker as unknown as Worker));
    act(() => result.current.apply(firstInput));
    act(() => result.current.apply(secondInput));
    expect(worker.postMessage).toHaveBeenNthCalledWith(1, { type: "calculate", requestId: 1, input: firstInput });
    expect(worker.postMessage).toHaveBeenNthCalledWith(2, { type: "calculate", requestId: 2, input: secondInput });

    expect(result.current.run).toBeNull();
    act(() => worker.onmessage?.({ data: { type: "result", requestId: 1, run: firstRun } } as MessageEvent));
    expect(result.current.run).toBeNull();
    act(() => worker.onmessage?.({ data: { type: "result", requestId: 2, run: secondRun } } as MessageEvent));
    expect(result.current.status).toBe("ready");
    expect(result.current.run).toBe(secondRun);
  });

  it("terminates its worker on unmount", () => {
    const worker = new FakeWorker();
    const { unmount } = renderHook(() => useInspectorRun(() => worker as unknown as Worker));
    unmount();
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
});
