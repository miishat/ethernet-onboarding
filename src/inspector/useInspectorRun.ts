import { useCallback, useEffect, useRef, useState } from "react";
import type { CompleteInspectorRun, RunInput } from "./types";
import type { WorkerRequest, WorkerResponse } from "./workerProtocol";

export type InspectorRunStatus = "idle" | "running" | "ready" | "error";
type WorkerFactory = () => Worker | null;

const createWorker: WorkerFactory = () => typeof Worker === "undefined" ? null : new Worker(new URL("./inspector.worker.ts", import.meta.url), { type: "module" });

export function useInspectorRun(factory: WorkerFactory = createWorker) {
  const workerRef = useRef<Worker | null>(null);
  const requestId = useRef(0);
  const [run, setRun] = useState<CompleteInspectorRun | null>(null);
  const [status, setStatus] = useState<InspectorRunStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const worker = factory();
    if (!worker) return;
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data;
      if (message.requestId !== requestId.current) return;
      if (message.type === "result") { setRun(message.run); setStatus("ready"); setError(null); }
      else { setRun(null); setStatus("error"); setError(message.message); }
    };
    worker.onerror = () => {
      setRun(null); setStatus("error"); setError("The calculation worker stopped unexpectedly.");
    };
    return () => { worker.terminate(); workerRef.current = null; };
  }, [factory]);

  const apply = useCallback((input: RunInput) => {
    const worker = workerRef.current;
    if (!worker) return;
    const next = requestId.current + 1;
    requestId.current = next;
    setRun(null); setError(null); setStatus("running");
    worker.postMessage({ type: "calculate", requestId: next, input } satisfies WorkerRequest);
  }, []);
  return { run, status, error, apply };
}
