import { z } from "zod";

export const createAgentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  instructions: z.string().min(1).default("You are a helpful assistant."),
  model: z.string().default("google/gemini-2.5-flash"),
  maxSteps: z.number().int().min(1).max(100).default(10),
  autonomy: z.enum(["manual", "approved", "autonomous"]).default("manual"),
});

export type CreateAgentInput = z.infer<typeof createAgentSchema>;

export const createAgentRunSchema = z.object({
  prompt: z.string().optional(),
  input: z.any().optional(),
  conversationId: z.string().uuid().optional(),
});

export type CreateAgentRunInput = z.infer<typeof createAgentRunSchema>;
