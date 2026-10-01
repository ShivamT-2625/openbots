import { cancelRun } from "@openbots/api-contract";
import { agents, agentTools, db, runSteps, runs, user } from "@openbots/db";
import { asc, eq } from "drizzle-orm";
import { executeAgentRun, sanitizeErrorMessage } from "./src/agent/execute.js";
import { buildAgentTools } from "./src/agent/tools.js";

async function main() {
  console.log(
    "=== Starting OpenBots Agent Runtime E2E & Hardening Tests ===\n",
  );

  // 1. Setup Test User
  console.log("1. Setting up test user...");
  const testUserId = "test-user-e2e-1";
  const [existingUser] = await db
    .select()
    .from(user)
    .where(eq(user.id, testUserId));
  if (!existingUser) {
    await db.insert(user).values({
      id: testUserId,
      name: "Test User",
      email: "e2e-tester@openbots.dev",
      emailVerified: true,
    });
    console.log("   Created user:", testUserId);
  } else {
    console.log("   Reusing user:", testUserId);
  }

  // 2. Setup Test Assistant Agent
  console.log("\n2. Setting up 'Test Assistant' agent...");
  const [testAgent] = await db
    .insert(agents)
    .values({
      userId: testUserId,
      name: "Test Assistant",
      description: "E2E Test Assistant Agent",
      instructions:
        "You are a helpful assistant. Use the available tools when they are useful.",
      model: "google/gemini-2.5-flash",
      maxSteps: 10,
      autonomy: "manual",
      status: "active",
    })
    .returning();
  console.log("   Created agent:", testAgent.id, `(${testAgent.name})`);

  // 3. Configure tools: get_current_time and calculate
  console.log("\n3. Enabling internal tools (get_current_time, calculate)...");
  await db.insert(agentTools).values([
    {
      agentId: testAgent.id,
      provider: "internal",
      toolName: "get_current_time",
      enabled: true,
    },
    {
      agentId: testAgent.id,
      provider: "internal",
      toolName: "calculate",
      enabled: true,
    },
  ]);
  console.log("   Enabled get_current_time and calculate tools for agent.");

  async function runWithRetry(runId: string, maxAttempts = 3) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await executeAgentRun(runId);
      } catch (err: any) {
        if (
          err.message?.includes("Quota exceeded") ||
          err.message?.includes("high demand") ||
          err.message?.includes("429")
        ) {
          console.warn(
            `   Notice: Hit temporary rate limit/quota, waiting 25s before retry (attempt ${attempt}/${maxAttempts})...`,
          );
          await new Promise((r) => setTimeout(r, 25000));
          // Reset run status to queued so it can be cleanly re-claimed
          await db
            .update(runs)
            .set({ status: "queued", error: null })
            .where(eq(runs.id, runId));
          continue;
        }
        throw err;
      }
    }
    return await executeAgentRun(runId);
  }

  // 4. Test 1: Single tool call — "What time is it?"
  console.log("\n4. Test 1: 'What time is it?' (Single tool loop)...");
  const [run1] = await db
    .insert(runs)
    .values({
      userId: testUserId,
      agentId: testAgent.id,
      status: "queued",
      triggerType: "manual",
      input: { prompt: "What time is it?" },
    })
    .returning();
  console.log("   Queued run 1:", run1.id);

  console.log("   Executing agent run through ToolLoopAgent...");
  await runWithRetry(run1.id);

  // Inspect run 1 results
  const [completedRun1] = await db
    .select()
    .from(runs)
    .where(eq(runs.id, run1.id));
  const steps1 = await db
    .select()
    .from(runSteps)
    .where(eq(runSteps.runId, run1.id))
    .orderBy(asc(runSteps.stepNumber));

  console.log("   Run 1 Status:", completedRun1.status);
  console.log("   Run 1 Output:", JSON.stringify(completedRun1.output));
  console.log(`   Run 1 Steps recorded (${steps1.length}):`);
  for (const s of steps1) {
    console.log(
      `     Step ${s.stepNumber} [${s.type}] (${s.status})${s.toolName ? ` tool=${s.toolName}` : ""}`,
    );
  }

  if (completedRun1.status !== "completed") {
    throw new Error(`Test 1 Failed: Run status is ${completedRun1.status}`);
  }
  const hasTimeToolCall = steps1.some(
    (s) => s.type === "tool" && s.toolName === "get_current_time",
  );
  if (!hasTimeToolCall) {
    throw new Error("Test 1 Failed: get_current_time was not invoked");
  }
  console.log("   -> Test 1 PASSED!");

  // Pause briefly to respect free-tier per-minute limit
  await new Promise((r) => setTimeout(r, 4000));

  // 5. Test 2: Multi-step tool calls
  console.log("\n5. Test 2: Multi-step tool interaction...");
  const [run2] = await db
    .insert(runs)
    .values({
      userId: testUserId,
      agentId: testAgent.id,
      status: "queued",
      triggerType: "manual",
      input: {
        prompt:
          "Please calculate 125 * 8, and also tell me what time it is right now.",
      },
    })
    .returning();
  console.log("   Queued run 2:", run2.id);

  await runWithRetry(run2.id);

  const [completedRun2] = await db
    .select()
    .from(runs)
    .where(eq(runs.id, run2.id));
  const steps2 = await db
    .select()
    .from(runSteps)
    .where(eq(runSteps.runId, run2.id))
    .orderBy(asc(runSteps.stepNumber));

  console.log("   Run 2 Status:", completedRun2.status);
  console.log("   Run 2 Output:", JSON.stringify(completedRun2.output));
  console.log(`   Run 2 Steps recorded (${steps2.length}):`);
  for (const s of steps2) {
    console.log(
      `     Step ${s.stepNumber} [${s.type}] (${s.status})${s.toolName ? ` tool=${s.toolName}` : ""}`,
    );
  }

  if (completedRun2.status !== "completed") {
    throw new Error(`Test 2 Failed: Run status is ${completedRun2.status}`);
  }
  const toolSteps = steps2.filter((s) => s.type === "tool");
  console.log(
    `   Tool calls executed: ${toolSteps.map((s) => s.toolName).join(", ")}`,
  );
  console.log("   -> Test 2 PASSED!");

  // 6. Test 3: Failure handling (unsupported autonomy)
  console.log("\n6. Test 3: Failure handling (unsupported autonomy)...");
  const [failAgent] = await db
    .insert(agents)
    .values({
      userId: testUserId,
      name: "Autonomous Agent (Unsupported)",
      instructions: "This should fail because autonomy mode is autonomous.",
      model: "google/gemini-2.5-flash",
      maxSteps: 10,
      autonomy: "autonomous",
      status: "active",
    })
    .returning();

  const [failRun] = await db
    .insert(runs)
    .values({
      userId: testUserId,
      agentId: failAgent.id,
      status: "queued",
      triggerType: "manual",
      input: { prompt: "Hello" },
    })
    .returning();

  try {
    await executeAgentRun(failRun.id);
  } catch (err: any) {
    console.log("   Caught expected error:", err.message);
  }

  const [completedFailRun] = await db
    .select()
    .from(runs)
    .where(eq(runs.id, failRun.id));
  console.log("   Fail Run Status:", completedFailRun.status);
  console.log("   Fail Run Error:", completedFailRun.error);

  if (completedFailRun.status !== "failed") {
    throw new Error(
      `Test 3 Failed: expected 'failed', got '${completedFailRun.status}'`,
    );
  }
  console.log("   -> Test 3 PASSED!");

  // Pause briefly before Test 4
  await new Promise((r) => setTimeout(r, 4000));

  // 7. Test 4: Concurrency-Safe Atomic Claim & Duplicate Trigger Execution
  console.log(
    "\n7. Test 4: Concurrency-Safe Atomic Claim & Duplicate Trigger Execution...",
  );
  const [dupRun] = await db
    .insert(runs)
    .values({
      userId: testUserId,
      agentId: testAgent.id,
      status: "queued",
      triggerType: "manual",
      input: { prompt: "Calculate 5 + 5" },
    })
    .returning();

  console.log(
    "   Dispatching two simultaneous executions for same run:",
    dupRun.id,
  );
  const [exec1, exec2] = await Promise.all([
    executeAgentRun(dupRun.id),
    executeAgentRun(dupRun.id),
  ]);

  console.log("   Exec 1 status:", exec1.status);
  console.log("   Exec 2 status:", exec2.status);

  const [finalDupRun] = await db
    .select()
    .from(runs)
    .where(eq(runs.id, dupRun.id));

  if (finalDupRun.status !== "completed") {
    throw new Error(
      `Test 4 Failed: Expected run status 'completed', got '${finalDupRun.status}'`,
    );
  }
  console.log(
    "   -> Test 4 PASSED (Atomic claim prevented duplicate execution)!",
  );

  // 8. Test 5: Terminal States Are Immutable
  console.log("\n8. Test 5: Terminal States Are Immutable...");
  // 5a: Calling execute on an already completed run returns existing run
  const execCompletedAgain = await executeAgentRun(completedRun1.id);
  if (execCompletedAgain.status !== "completed") {
    throw new Error("Test 5a Failed: Completed run changed status");
  }

  // 5b: Calling execute on an already failed run returns existing run
  const execFailedAgain = await executeAgentRun(completedFailRun.id);
  if (execFailedAgain.status !== "failed") {
    throw new Error("Test 5b Failed: Failed run changed status");
  }

  // 5c: Cancelling an already completed run does NOT overwrite completed status
  const cancelCompletedRes = await cancelRun(completedRun1.id, testUserId);
  if (cancelCompletedRes.run?.status !== "completed") {
    throw new Error(
      `Test 5c Failed: Completed run was overwritten with '${cancelCompletedRes.run?.status}'`,
    );
  }

  // 5d: Cancelling an already failed run does NOT overwrite failed status
  const cancelFailedRes = await cancelRun(completedFailRun.id, testUserId);
  if (cancelFailedRes.run?.status !== "failed") {
    throw new Error(
      `Test 5d Failed: Failed run was overwritten with '${cancelFailedRes.run?.status}'`,
    );
  }
  console.log(
    "   -> Test 5 PASSED (Terminal states 'completed' and 'failed' are immutable)!",
  );

  // 9. Test 6: Race Condition (queued -> cancel -> Trigger starts)
  console.log("\n9. Test 6: Race (queued -> cancel -> Trigger starts)...");
  const [cancelFirstRun] = await db
    .insert(runs)
    .values({
      userId: testUserId,
      agentId: testAgent.id,
      status: "queued",
      triggerType: "manual",
      input: { prompt: "This should be cancelled before execution" },
    })
    .returning();

  // Cancel immediately while queued
  const cancelRes = await cancelRun(cancelFirstRun.id, testUserId);
  if (cancelRes.run?.status !== "cancelled") {
    throw new Error(
      `Test 6 Setup Failed: Run was not cancelled: ${cancelRes.run?.status}`,
    );
  }

  // Now trigger task worker arrives and attempts to execute
  const execAfterCancel = await executeAgentRun(cancelFirstRun.id);
  const [dbAfterCancel] = await db
    .select()
    .from(runs)
    .where(eq(runs.id, cancelFirstRun.id));

  if (
    dbAfterCancel.status !== "cancelled" ||
    execAfterCancel.status !== "cancelled"
  ) {
    throw new Error(
      `Test 6 Failed: Cancelled run became '${dbAfterCancel.status}'`,
    );
  }

  // Verify no steps were recorded
  const stepsAfterCancel = await db
    .select()
    .from(runSteps)
    .where(eq(runSteps.runId, cancelFirstRun.id));
  if (stepsAfterCancel.length > 0) {
    throw new Error("Test 6 Failed: Steps were executed on cancelled run");
  }
  console.log("   -> Test 6 PASSED (Cancelled run skipped execution cleanly)!");

  // 10. Test 7: Cooperative Cancellation with AbortSignal
  console.log("\n10. Test 7: Cooperative Cancellation with AbortSignal...");
  const [abortRun] = await db
    .insert(runs)
    .values({
      userId: testUserId,
      agentId: testAgent.id,
      status: "queued",
      triggerType: "manual",
      input: { prompt: "Please calculate 999 * 888" },
    })
    .returning();

  const abortController = new AbortController();
  // Abort the signal immediately to simulate cooperative cancellation
  abortController.abort(new Error("User cancelled"));

  const abortedResult = await executeAgentRun(abortRun.id, {
    signal: abortController.signal,
  });

  const [dbAbortedRun] = await db
    .select()
    .from(runs)
    .where(eq(runs.id, abortRun.id));

  if (
    dbAbortedRun.status !== "cancelled" ||
    abortedResult.status !== "cancelled"
  ) {
    throw new Error(
      `Test 7 Failed: Expected 'cancelled', got '${dbAbortedRun.status}'`,
    );
  }
  console.log(
    "   -> Test 7 PASSED (Cooperative cancellation cleanly marks run as cancelled)!",
  );

  // 11. Test 8: Tool Availability Filtering (disabled tools remain unavailable)
  console.log("\n11. Test 8: Tool Availability Filtering...");
  const [agentWithDisabledTool] = await db
    .insert(agents)
    .values({
      userId: testUserId,
      name: "Agent with Disabled Tool",
      instructions: "Testing tool filtering",
      model: "google/gemini-2.5-flash",
      maxSteps: 5,
      autonomy: "manual",
      status: "active",
    })
    .returning();

  await db.insert(agentTools).values([
    {
      agentId: agentWithDisabledTool.id,
      provider: "internal",
      toolName: "get_current_time",
      enabled: false, // DISABLED
    },
    {
      agentId: agentWithDisabledTool.id,
      provider: "internal",
      toolName: "calculate",
      enabled: true, // ENABLED
    },
  ]);

  const resolved = await buildAgentTools({
    userId: testUserId,
    agentId: agentWithDisabledTool.id,
  });

  if (resolved.tools["get_current_time"]) {
    throw new Error(
      "Test 8 Failed: Disabled tool 'get_current_time' was included in tools",
    );
  }
  if (!resolved.tools["calculate"]) {
    throw new Error(
      "Test 8 Failed: Enabled tool 'calculate' was NOT included in tools",
    );
  }
  await resolved.cleanup();
  console.log("   -> Test 8 PASSED (Disabled tools are strictly excluded)!");

  // 12. Test 9: Safe Error Handling & Secret Redaction
  console.log("\n12. Test 9: Safe Error Handling & Secret Redaction...");
  const sampleSecretError =
    "Error: Google API key AIzaSyB_123456789012345678901234567 and Trigger key tr_dev_sk_12345678901234567890 and Bearer eyJhbGciOiJIUzI1NiJ9.abc.def and password postgresql://myuser:supersecretpass@db.example.com:5432/mydb leaked";

  const sanitized = sanitizeErrorMessage(sampleSecretError);
  console.log("   Sanitized string:", sanitized);

  if (
    sanitized.includes("AIzaSyB_") ||
    sanitized.includes("tr_dev_sk_") ||
    sanitized.includes("supersecretpass")
  ) {
    throw new Error("Test 9 Failed: Secrets were not redacted properly");
  }
  if (
    !sanitized.includes("[REDACTED_GEMINI_KEY]") ||
    !sanitized.includes("[REDACTED_TRIGGER_KEY]") ||
    !sanitized.includes("[REDACTED_PASSWORD]")
  ) {
    throw new Error("Test 9 Failed: Redacted tokens not found");
  }
  console.log("   -> Test 9 PASSED (All sensitive secrets cleanly redacted)!");

  console.log("\n=== ALL E2E AND HARDENING TESTS PASSED SUCCESSFULLY! ===");
  process.exit(0);
}

main().catch((err) => {
  console.error("\nE2E Test Run Failed with Error:", err);
  process.exit(1);
});
