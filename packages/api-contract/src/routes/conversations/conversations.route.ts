import { Hono } from "hono";
import { authMiddleware } from "../../middleware/auth.js";
import { getConversation, listConversations } from "./conversations.logic.js";

type Env = {
  Variables: {
    user: { id: string };
  };
};

export const conversationsRoute = new Hono<Env>()
  .use("*", authMiddleware)

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
