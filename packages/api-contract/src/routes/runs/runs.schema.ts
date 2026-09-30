import { z } from "zod";

export const RunStatus = {
  QUEUED: "queued",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
} as const;

export type RunStatus = (typeof RunStatus)[keyof typeof RunStatus];

export const createRunSchema = z.object({
  taskId: z.string().min(1),
});

export type CreateRunInput = z.infer<typeof createRunSchema>;
