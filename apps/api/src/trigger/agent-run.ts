import { task } from "@trigger.dev/sdk";
import { executeAgentRun } from "../agent/execute.js";

export const agentRunTask = task({
  id: "agent-run",
  run: async (payload: { runId: string }) => {
    return await executeAgentRun(payload.runId);
  },
});
