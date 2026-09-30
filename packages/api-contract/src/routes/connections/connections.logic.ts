import type { CreateConnectionInput } from "./connections.schema.js"

export function listConnections() {
  return { connections: [] }
}

export function getConnection(id: string) {
  return { connection: { id, name: "placeholder", status: "active" } }
}

export function createConnection(data: CreateConnectionInput) {
  return { connection: { id: "new", ...data, status: "active" as const } }
}
