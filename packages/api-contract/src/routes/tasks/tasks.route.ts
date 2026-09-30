import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { createTaskSchema } from "./tasks.schema.js"
import { listTasks, getTask, createTask } from "./tasks.logic.js"

export const tasksRoute = new Hono()
  .get("/", (c) => {
    return c.json(listTasks())
  })
  .get("/:id", (c) => {
    const id = c.req.param("id")
    return c.json(getTask(id))
  })
  .post("/", zValidator("json", createTaskSchema), (c) => {
    const data = c.req.valid("json")
    return c.json(createTask(data), 201)
  })
