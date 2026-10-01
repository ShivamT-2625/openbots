import { Composio } from "@composio/core";
import { VercelProvider } from "@composio/vercel";

let instance: Composio<VercelProvider> | null = null;

export function getComposio(): Composio<VercelProvider> {
  if (!instance) {
    if (!process.env.COMPOSIO_API_KEY) {
      throw new Error("COMPOSIO_API_KEY environment variable is required");
    }
    instance = new Composio({
      apiKey: process.env.COMPOSIO_API_KEY,
      provider: new VercelProvider(),
    });
  }
  return instance;
}
