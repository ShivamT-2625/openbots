import { app } from "@openbots/api-contract";

const port = parseInt(process.env.PORT ?? "3001", 10);

console.log(`API server starting on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
