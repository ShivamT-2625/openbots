import { agents, db, runs } from "@openbots/db";
import { tasks } from "@trigger.dev/sdk";
import { and, eq } from "drizzle-orm";
import type { CreateAgentInput, CreateAgentRunInput } from "./agents.schema.js";

export async function listAgents(userId: string) {
  const userAgents = await db
    .select()
    .from(agents)
    .where(eq(agents.userId, userId));
  return { agents: userAgents };
}

export async function getAgent(id: string, userId: string) {
  const [agent] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, id), eq(agents.userId, userId)));
  if (!agent) {
    return null;
  }
  return { agent };
}

export async function createAgent(userId: string, data: CreateAgentInput) {
  const [agent] = await db
    .insert(agents)
    .values({
      userId,
      name: data.name,
      description: data.description,
      instructions: data.instructions,
      model: data.model,
      maxSteps: data.maxSteps,
      autonomy: data.autonomy,
      status: "active",
    })
    .returning();
  return { agent };
}

export async function createAgentRun(
  userId: string,
  agentId: string,
  data: CreateAgentRunInput,
) {
  const [agent] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.userId, userId)));

  if (!agent) {
    return { error: "Agent not found or unauthorized", status: 404 as const };
  }

  const [run] = await db
    .insert(runs)
    .values({
      userId,
      agentId: agent.id,
      conversationId: data.conversationId,
      status: "queued",
      triggerType: "manual",
      input: data.prompt ? { prompt: data.prompt } : (data.input ?? null),
    })
    .returning();

  if (!run) {
    return { error: "Failed to create run", status: 500 as const };
  }

  // Enqueue durable task with Trigger.dev
  try {
    await tasks.trigger("agent-run", { runId: run.id });
  } catch (err) {
    console.warn("Could not dispatch Trigger.dev task for run:", run.id, err);
  }

  return {
    run: {
      id: run.id,
      status: run.status,
    },
    status: 201 as const,
  };
}
