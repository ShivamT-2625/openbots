import type { Context, Next } from "hono";
import { auth } from "../lib/auth.js";

export async function authMiddleware(c: Context, next: Next) {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) {
    if (process.env.NODE_ENV !== "production") {
      const devUserId = c.req.header("x-user-id");
      if (devUserId) {
        c.set("user", {
          id: devUserId,
          name: "Dev User",
          email: "dev@openbots.local",
        });
        return await next();
      }
    }
    return c.json({ error: "Unauthorized" }, 401);
  }
  c.set("user", session.user);
  await next();
}
