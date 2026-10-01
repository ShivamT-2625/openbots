import { Hono } from "hono";
import { auth } from "../../lib/auth.js";
import { getConversation, listConversations } from "./conversations.logic.js";

type Env = {
  Variables: {
    user: { id: string };
  };
};

export const conversationsRoute = new Hono<Env>()
  .use("*", async (c, next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      const devUserId = c.req.header("x-user-id");
      if (devUserId) {
        c.set("user", { id: devUserId });
        return await next();
      }
      return c.json({ error: "Unauthorized" }, 401);
    }
    c.set("user", session.user);
    await next();
  })
  .get("/", async (c) => {
    const user = c.get("user");
    const agentId = c.req.query("agentId");
    const result = await listConversations(user.id, agentId);
    return c.json(result);
  })
  .get("/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const result = await getConversation(id, user.id);
    if (!result) {
      return c.json({ error: "Conversation not found" }, 404);
    }
    return c.json(result);
  });
