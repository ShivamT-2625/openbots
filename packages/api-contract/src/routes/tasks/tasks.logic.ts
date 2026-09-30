import type { CreateTaskInput } from "./tasks.schema.js"

export function listTasks() {
  return { tasks: [] }
}

export function getTask(id: string) {
  return { task: { id, agentId: "placeholder", status: "pending" } }
}

export function createTask(data: CreateTaskInput) {
  return { task: { id: "new", ...data, status: "pending" as const } }
}
