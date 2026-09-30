import { z } from "zod"

export const ConnectionStatus = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  ERROR: "error",
} as const

export type ConnectionStatus =
  (typeof ConnectionStatus)[keyof typeof ConnectionStatus]

export const createConnectionSchema = z.object({
  name: z.string().min(1),
  provider: z.string().min(1),
})

export type CreateConnectionInput = z.infer<typeof createConnectionSchema>
