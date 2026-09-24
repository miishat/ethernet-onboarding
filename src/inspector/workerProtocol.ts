import type { CompleteInspectorRun, RunInput } from "./types";

export type WorkerRequest = { type: "calculate"; requestId: number; input: RunInput };
export type WorkerResponse =
  | { type: "result"; requestId: number; run: CompleteInspectorRun }
  | { type: "error"; requestId: number; message: string };
