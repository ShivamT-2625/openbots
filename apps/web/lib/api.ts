import { createClient } from "@openbots/api-client";

export const DEV_DEFAULT_USER_ID = "test-user-e2e-1";

export function getActiveUserId(): string {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("openbots_user_id");
    if (stored) return stored;
    localStorage.setItem("openbots_user_id", DEV_DEFAULT_USER_ID);
    return DEV_DEFAULT_USER_ID;
  }
  return DEV_DEFAULT_USER_ID;
}

export function setActiveUserId(userId: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("openbots_user_id", userId);
  }
}

export function getClient() {
  const userId = getActiveUserId();
  return createClient(undefined, {
    headers: {
      "x-user-id": userId,
    },
  });
}
