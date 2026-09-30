import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { createRunSchema } from "./runs.schema.js"
import { listRuns, getRun, createRun } from "./runs.logic.js"

export const runsRoute = new Hono()
  .get("/", (c) => {
    return c.json(listRuns())
  })
  .get("/:id", (c) => {
    const id = c.req.param("id")
    return c.json(getRun(id))
  })
  .post("/", zValidator("json", createRunSchema), (c) => {
    const data = c.req.valid("json")
    return c.json(createRun(data), 201)
  })
