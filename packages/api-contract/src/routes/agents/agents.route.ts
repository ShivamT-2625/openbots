import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { createAgent, getAgent, listAgents } from "./agents.logic.js";
import { createAgentSchema } from "./agents.schema.js";

export const agentsRoute = new Hono()
  .get("/", (c) => {
    return c.json(listAgents());
  })
  .get("/:id", (c) => {
    const id = c.req.param("id");
    return c.json(getAgent(id));
  })
  .post("/", zValidator("json", createAgentSchema), (c) => {
    const data = c.req.valid("json");
    return c.json(createAgent(data), 201);
  });
