import { Hono } from "hono";
import { authMiddleware } from "../../middleware/auth.js";
import { cancelRun, getRun, listRuns } from "./runs.logic.js";

type Env = {
  Variables: {
    user: { id: string };
  };
};

export const runsRoute = new Hono<Env>()
  .use("*", authMiddleware)

  .get("/", async (c) => {
    const user = c.get("user");
    const agentId = c.req.query("agentId");
    const result = await listRuns(user.id, agentId);
    return c.json(result);
  })
  .get("/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const result = await getRun(id, user.id);
    if (!result) {
      return c.json({ error: "Run not found" }, 404);
    }
    return c.json(result);
  })
  .post("/:id/cancel", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const result = await cancelRun(id, user.id);
    if ("error" in result) {
      return c.json({ error: result.error }, result.status);
    }
    return c.json({ run: result.run });
  });
