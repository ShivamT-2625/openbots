import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import {
  createConnection,
  getConnection,
  listConnections,
} from "./connections.logic.js";
import { createConnectionSchema } from "./connections.schema.js";

export const connectionsRoute = new Hono()
  .get("/", (c) => {
    return c.json(listConnections());
  })
  .get("/:id", (c) => {
    const id = c.req.param("id");
    return c.json(getConnection(id));
  })
  .post("/", zValidator("json", createConnectionSchema), (c) => {
    const data = c.req.valid("json");
    return c.json(createConnection(data), 201);
  });
