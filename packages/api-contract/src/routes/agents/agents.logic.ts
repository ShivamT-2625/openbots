import type { CreateAgentInput } from "./agents.schema.js"

export function listAgents() {
  return { agents: [] }
}

export function getAgent(id: string) {
  return { agent: { id, name: "placeholder", status: "idle" } }
}

export function createAgent(data: CreateAgentInput) {
  return { agent: { id: "new", ...data, status: "idle" as const } }
}
