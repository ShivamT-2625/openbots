import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { agents, db, messages, runSteps, runs } from "@openbots/db";
import { stepCountIs, ToolLoopAgent } from "ai";
import { asc, eq } from "drizzle-orm";
import { buildAgentTools } from "./tools.js";

function getGoogleClient() {
  const apiKey =
    process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY environment variable is required",
    );
  }
  return createGoogleGenerativeAI({ apiKey });
}

function resolveModel(modelName: string) {
  let normalized = modelName;
  if (normalized.startsWith("google/")) {
    normalized = normalized.replace("google/", "");
  } else if (normalized.startsWith("openai/") || normalized === "default") {
    normalized = "gemini-2.5-flash";
  }
  const client = getGoogleClient();
  return client(normalized);
}

function sanitizeErrorMessage(error: unknown): string {
  if (!error) return "Unknown error during execution";
  const rawMessage = error instanceof Error ? error.message : String(error);
  // Redact potential API keys and secrets
  return rawMessage
    .replace(/sk-[a-zA-Z0-9_-]{20,}/g, "[REDACTED_API_KEY]")
    .replace(/Bearer\s+[a-zA-Z0-9_.-]+/gi, "Bearer [REDACTED_TOKEN]")
    .replace(
      /(api[_-]?key|token|secret)\s*[:=]\s*['"][^'"]+['"]/gi,
      "$1=[REDACTED]",
    );
}

export async function executeAgentRun(runId: string) {
  const [runRecord] = await db.select().from(runs).where(eq(runs.id, runId));
  if (!runRecord) {
    throw new Error(`Run not found: ${runId}`);
  }

  if (runRecord.status === "cancelled" || runRecord.status === "completed") {
    return runRecord;
  }

  const [agentRecord] = await db
    .select()
    .from(agents)
    .where(eq(agents.id, runRecord.agentId));

  if (!agentRecord) {
    const errorMsg = `Agent not found for run ${runId}`;
    await db
      .update(runs)
      .set({
        status: "failed",
        error: errorMsg,
        completedAt: new Date(),
      })
      .where(eq(runs.id, runId));
    throw new Error(errorMsg);
  }

  // Validate agent ownership
  if (agentRecord.userId !== runRecord.userId) {
    const errorMsg = "Run owner does not match agent owner";
    await db
      .update(runs)
      .set({
        status: "failed",
        error: errorMsg,
        completedAt: new Date(),
      })
      .where(eq(runs.id, runId));
    throw new Error(errorMsg);
  }

  // Validate autonomy: only manual is currently supported
  if (agentRecord.autonomy !== "manual") {
    const errorMsg = `Unsupported autonomy mode '${agentRecord.autonomy}'. Currently only 'manual' is supported.`;
    await db
      .update(runs)
      .set({
        status: "failed",
        error: errorMsg,
        completedAt: new Date(),
      })
      .where(eq(runs.id, runId));
    throw new Error(errorMsg);
  }

  // Mark run as running
  await db
    .update(runs)
    .set({
      status: "running",
      startedAt: new Date(),
    })
    .where(eq(runs.id, runId));

  let resolvedTools: Awaited<ReturnType<typeof buildAgentTools>> | null = null;

  try {
    resolvedTools = await buildAgentTools({
      userId: runRecord.userId,
      agentId: agentRecord.id,
    });

    // Prepare conversation messages
    const inputMessages: Array<{
      role: "user" | "assistant" | "system";
      content: string;
    }> = [];

    if (runRecord.conversationId) {
      const history = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, runRecord.conversationId))
        .orderBy(asc(messages.createdAt));

      for (const m of history) {
        if (
          m.role === "user" ||
          m.role === "assistant" ||
          m.role === "system"
        ) {
          let textContent = "";
          if (typeof m.content === "string") {
            textContent = m.content;
          } else if (m.content && typeof m.content === "object") {
            textContent =
              (m.content as any).text ??
              (m.content as any).prompt ??
              JSON.stringify(m.content);
          }
          inputMessages.push({
            role: m.role,
            content: textContent,
          });
        }
      }
    }

    // Add current run input
    const inputObj = runRecord.input as any;
    const promptText =
      typeof inputObj === "string"
        ? inputObj
        : (inputObj?.prompt ??
          inputObj?.text ??
          (inputObj?.messages ? null : JSON.stringify(inputObj ?? "")));

    if (promptText) {
      inputMessages.push({
        role: "user",
        content: promptText,
      });

      // If tied to a conversation, persist the incoming user message
      if (runRecord.conversationId) {
        await db.insert(messages).values({
          conversationId: runRecord.conversationId,
          role: "user",
          content: { text: promptText },
        });
      }
    } else if (Array.isArray(inputObj?.messages)) {
      for (const m of inputObj.messages) {
        inputMessages.push(m);
      }
    }

    // Construct ToolLoopAgent using AI SDK
    const model = resolveModel(agentRecord.model);
    const agent = new ToolLoopAgent({
      model,
      instructions: agentRecord.instructions,
      tools: resolvedTools.tools,
      stopWhen: stepCountIs(agentRecord.maxSteps ?? 10),
    });

    let currentStepNumber = 0;

    const result = await agent.generate({
      messages: inputMessages as any,
      onStepFinish: async (step) => {
        // Record model step
        await db.insert(runSteps).values({
          runId: runRecord.id,
          stepNumber: currentStepNumber++,
          type: "model",
          status: "completed",
          model: agentRecord.model,
          output: {
            text: step.text,
            finishReason: step.finishReason,
            usage: step.usage,
          },
        });

        // Record any tool execution steps
        if (step.toolResults && step.toolResults.length > 0) {
          for (const tr of step.toolResults) {
            await db.insert(runSteps).values({
              runId: runRecord.id,
              stepNumber: currentStepNumber++,
              type: "tool",
              status: "completed",
              toolName: tr.toolName,
              toolCallId: tr.toolCallId,
              toolInput: ((tr as any).input ?? (tr as any).args ?? null) as any,
              toolOutput: ((tr as any).output ??
                (tr as any).result ??
                null) as any,
            });
          }
        }
      },
    });

    // Update run to completed
    const finalOutput = {
      text: result.text,
      steps: result.steps?.length ?? 0,
      usage: result.usage,
    };

    await db
      .update(runs)
      .set({
        status: "completed",
        output: finalOutput,
        completedAt: new Date(),
      })
      .where(eq(runs.id, runId));

    // If part of conversation, persist assistant's final response
    if (runRecord.conversationId && result.text) {
      await db.insert(messages).values({
        conversationId: runRecord.conversationId,
        role: "assistant",
        content: { text: result.text },
      });
    }

    return {
      runId,
      status: "completed",
      output: finalOutput,
    };
  } catch (error) {
    const safeError = sanitizeErrorMessage(error);
    await db
      .update(runs)
      .set({
        status: "failed",
        error: safeError,
        completedAt: new Date(),
      })
      .where(eq(runs.id, runId));

    throw new Error(safeError);
  } finally {
    if (resolvedTools) {
      await resolvedTools.cleanup();
    }
  }
}
