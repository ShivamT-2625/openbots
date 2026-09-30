import type { CreateRunInput } from "./runs.schema.js";

export function listRuns() {
  return { runs: [] };
}

export function getRun(id: string) {
  return { run: { id, taskId: "placeholder", status: "queued" } };
}

export function createRun(data: CreateRunInput) {
  return { run: { id: "new", ...data, status: "queued" as const } };
}
