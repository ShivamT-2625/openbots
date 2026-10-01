import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { authMiddleware } from "../../middleware/auth.js";
import {
  createConnection,
  deleteConnection,
  getConnection,
  listConnections,
} from "./connections.logic.js";
import { createConnectionSchema } from "./connections.schema.js";

type Env = {
  Variables: {
    user: { id: string };
  };
};

export const connectionsRoute = new Hono<Env>()
  .use("*", authMiddleware)
  .get("/", async (c) => {
    const user = c.get("user");
    const result = await listConnections(user.id);
    return c.json(result);
  })
  .get("/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const result = await getConnection(id, user.id);
    if (!result) {
      return c.json({ error: "Connection not found" }, 404);
    }
    return c.json(result);
  })
  .post("/", zValidator("json", createConnectionSchema), async (c) => {
    const user = c.get("user");
    const data = c.req.valid("json");
    const result = await createConnection(user.id, data);
    return c.json(result, 201);
  })
  .delete("/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const result = await deleteConnection(id, user.id);
    if (!result) {
      return c.json({ error: "Connection not found" }, 404);
    }
    return c.json({ success: true, connection: result.connection });
  });
