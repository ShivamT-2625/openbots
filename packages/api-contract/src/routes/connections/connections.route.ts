import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { authMiddleware } from "../../middleware/auth.js";
import {
  createConnection,
  deleteConnection,
  getConnection,
  initiateConnection,
  listConnections,
} from "./connections.logic.js";
import {
  createConnectionSchema,
  initiateConnectionSchema,
} from "./connections.schema.js";

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
  .post(
    "/initiate",
    zValidator("json", initiateConnectionSchema),
    async (c) => {
      const user = c.get("user");
      const { appName } = c.req.valid("json");
      try {
        const result = await initiateConnection(user.id, appName);
        return c.json(result);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to initiate connection";
        return c.json({ error: message }, 500);
      }
    },
  )
  .delete("/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const result = await deleteConnection(id, user.id);
    if (!result) {
      return c.json({ error: "Connection not found" }, 404);
    }
    return c.json({ success: true, connection: result.connection });
  });
