import { Hono } from "hono";
import { agentsRoute } from "./routes/agents/agents.route.js";
import { connectionsRoute } from "./routes/connections/connections.route.js";
import { runsRoute } from "./routes/runs/runs.route.js";
import { tasksRoute } from "./routes/tasks/tasks.route.js";

const app = new Hono()
  .basePath("/api")
  .get("/health", (c) => {
    return c.json({ status: "ok" });
  })
  .route("/agents", agentsRoute)
  .route("/tasks", tasksRoute)
  .route("/runs", runsRoute)
  .route("/connections", connectionsRoute);

export type AppType = typeof app;
export { app };
