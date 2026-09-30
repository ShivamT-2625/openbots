import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { createTask, getTask, listTasks } from "./tasks.logic.js";
import { createTaskSchema } from "./tasks.schema.js";

export const tasksRoute = new Hono()
  .get("/", (c) => {
    return c.json(listTasks());
  })
  .get("/:id", (c) => {
    const id = c.req.param("id");
    return c.json(getTask(id));
  })
  .post("/", zValidator("json", createTaskSchema), (c) => {
    const data = c.req.valid("json");
    return c.json(createTask(data), 201);
  });
