import { hc } from "hono/client"
import type { AppType } from "@openbots/api"

export type { AppType } from "@openbots/api"

function getApiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_API_URL environment variable is required. " +
        "Set it to the base URL of the API server (e.g. http://localhost:3001)."
    )
  }
  return url
}

export function createClient(baseUrl?: string) {
  const url = baseUrl ?? getApiBaseUrl()
  return hc<AppType>(url)
}

export type Client = ReturnType<typeof createClient>
