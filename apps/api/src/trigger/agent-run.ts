import { db, runs } from "@openbots/db";
import { task } from "@trigger.dev/sdk";
import { and, eq, inArray } from "drizzle-orm";
import { executeAgentRun } from "../agent/execute.js";

export const agentRunTask = task({
  id: "agent-run",
  retry: {
    maxAttempts: 1, // Runs are managed atomically by database transitions; disable blind retries
  },
  run: async (payload: { runId: string }, { ctx }: { ctx?: any } = {}) => {
    return await executeAgentRun(payload.runId, { signal: ctx?.signal });
  },
  onCancel: async ({ payload }: any) => {
    // If Trigger.dev signals cancellation, ensure DB status transitions to cancelled if still active
    if (!payload?.runId) return;
    await db
      .update(runs)
      .set({
        status: "cancelled",
        completedAt: new Date(),
      })
      .where(
        and(
          eq(runs.id, payload.runId),
          inArray(runs.status, ["queued", "running"]),
        ),
      );
  },
});
