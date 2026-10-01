import { Hono } from "hono";
import { auth } from "../../lib/auth.js";
import { cancelRun, getRun, listRuns } from "./runs.logic.js";

type Env = {
  Variables: {
    user: { id: string };
  };
};

export const runsRoute = new Hono<Env>()
  .use("*", async (c, next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    c.set("user", session.user);
    await next();
  })
  .get("/", async (c) => {
    const user = c.get("user");
    const result = await listRuns(user.id);
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
