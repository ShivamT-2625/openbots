import { createClient } from "@openbots/api-client";

let clientInstance: ReturnType<typeof createClient> | null = null;

export function getClient() {
  if (!clientInstance) {
    clientInstance = createClient(undefined, {
      init: {
        credentials: "include",
      },
    });
  }
  return clientInstance;
}
