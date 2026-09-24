/// <reference lib="webworker" />
import { buildInspectorRun } from "./engine/run";
import type { WorkerRequest, WorkerResponse } from "./workerProtocol";

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  if (request.type !== "calculate") return;
  try {
    const result = buildInspectorRun(request.input);
    const response: WorkerResponse = result.ok
      ? { type: "result", requestId: request.requestId, run: result.value }
      : { type: "error", requestId: request.requestId, message: result.errors.run || "Calculation failed." };
    self.postMessage(response);
  } catch (error) {
    self.postMessage({ type: "error", requestId: request.requestId, message: error instanceof Error ? error.message : "Calculation failed." } satisfies WorkerResponse);
  }
};
