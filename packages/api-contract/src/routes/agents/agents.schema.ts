import { z } from "zod";

export const AgentStatus = {
  IDLE: "idle",
  RUNNING: "running",
  ERROR: "error",
} as const;

export type AgentStatus = (typeof AgentStatus)[keyof typeof AgentStatus];

export const createAgentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export type CreateAgentInput = z.infer<typeof createAgentSchema>;
