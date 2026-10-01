import { db, runSteps, runs } from "@openbots/db";
import { runs as triggerRuns } from "@trigger.dev/sdk";
import { and, asc, eq } from "drizzle-orm";

export async function listRuns(userId: string) {
  const userRuns = await db.select().from(runs).where(eq(runs.userId, userId));
  return { runs: userRuns };
}

export async function getRun(runId: string, userId: string) {
  const [run] = await db
    .select()
    .from(runs)
    .where(and(eq(runs.id, runId), eq(runs.userId, userId)));

  if (!run) {
    return null;
  }

  const steps = await db
    .select()
    .from(runSteps)
    .where(eq(runSteps.runId, runId))
    .orderBy(asc(runSteps.stepNumber));

  return { run, steps };
}

export async function cancelRun(runId: string, userId: string) {
  const [run] = await db
    .select()
    .from(runs)
    .where(and(eq(runs.id, runId), eq(runs.userId, userId)));

  if (!run) {
    return { error: "Run not found", status: 404 as const };
  }

  if (
    run.status === "completed" ||
    run.status === "failed" ||
    run.status === "cancelled"
  ) {
    return { run, status: 200 as const };
  }

  const [cancelled] = await db
    .update(runs)
    .set({
      status: "cancelled",
      completedAt: new Date(),
    })
    .where(eq(runs.id, runId))
    .returning();

  try {
    await triggerRuns.cancel(runId);
  } catch {
    // Ignore Trigger.dev task cancel errors
  }

  return { run: cancelled, status: 200 as const };
}
