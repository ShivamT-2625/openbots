import { z } from "zod"

export const TaskStatus = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  FAILED: "failed",
} as const

export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus]

export const createTaskSchema = z.object({
  agentId: z.string().min(1),
  input: z.string().min(1),
})

export type CreateTaskInput = z.infer<typeof createTaskSchema>
