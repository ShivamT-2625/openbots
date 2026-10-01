import { Composio } from "@composio/core";
import { connections, db } from "@openbots/db";
import { and, desc, eq } from "drizzle-orm";

export async function listConnections(userId: string) {
  const userConnections = await db
    .select()
    .from(connections)
    .where(eq(connections.userId, userId))
    .orderBy(desc(connections.createdAt));

  return { connections: userConnections };
}

export async function getConnection(id: string, userId: string) {
  const [connection] = await db
    .select()
    .from(connections)
    .where(and(eq(connections.id, id), eq(connections.userId, userId)));

  if (!connection) {
    return null;
  }

  return { connection };
}

export async function createConnection(
  userId: string,
  data: { provider: string; externalAccountId: string; metadata?: any },
) {
  const [connection] = await db
    .insert(connections)
    .values({
      userId,
      provider: data.provider,
      externalAccountId: data.externalAccountId,
      status: "active",
      metadata: data.metadata ?? null,
    })
    .onConflictDoUpdate({
      target: [
        connections.userId,
        connections.provider,
        connections.externalAccountId,
      ],
      set: {
        status: "active",
        metadata: data.metadata ?? null,
        updatedAt: new Date(),
      },
    })
    .returning();

  return { connection };
}

export async function deleteConnection(id: string, userId: string) {
  const [deleted] = await db
    .delete(connections)
    .where(and(eq(connections.id, id), eq(connections.userId, userId)))
    .returning();

  if (!deleted) {
    return null;
  }

  return { connection: deleted };
}

export async function initiateConnection(userId: string, appName: string) {
  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) {
    throw new Error("COMPOSIO_API_KEY is required for initiating connections");
  }

  const composio = new Composio({ apiKey });

  // 1. Find the auth config for the toolkit
  let authConfigId: string | null = null;

  try {
    const listRes = await composio.authConfigs.list({
      toolkit: appName.toLowerCase(),
      showDisabled: false,
    });
    const configs = listRes.items || [];
    const active =
      configs.find((c) => c.status === "ENABLED") ?? configs[0];
    if (active?.id) {
      authConfigId = active.id;
    }
  } catch {
    // If authConfigs.list fails, try toolkit metadata
  }

  if (!authConfigId) {
    try {
      const toolkit = (await composio.toolkits.get(appName.toLowerCase())) as any;
      const authConfigs: any[] = toolkit.authConfigDetails?.items ?? [];
      const primaryConfig =
        authConfigs.find((c: any) => c.status === "ENABLED") ?? authConfigs[0];
      if (primaryConfig?.id) {
        authConfigId = primaryConfig.id;
      }
    } catch {
      // Continue to link call if not resolved
    }
  }

  if (!authConfigId) {
    throw new Error(
      `No active authentication configuration found for ${appName}. Please ensure ${appName} integration is enabled in Composio.`,
    );
  }

  // 2. Link using POST /api/v3/connected_accounts/link
  const linkResult = await composio.connectedAccounts.link(userId, authConfigId);
  const redirectUrl = linkResult.redirectUrl ?? null;
  const connectionRequestId = linkResult.id ?? null;

  if (!redirectUrl) {
    throw new Error(
      `No redirect URL returned for ${appName}. The app may not support OAuth or may already be connected.`,
    );
  }

  await db
    .insert(connections)
    .values({
      userId,
      provider: appName.toLowerCase(),
      externalAccountId: connectionRequestId ?? `${appName.toLowerCase()}_${Date.now()}`,
      status: "active",
      metadata: { initiatedAt: new Date().toISOString() },
    })
    .onConflictDoUpdate({
      target: [
        connections.userId,
        connections.provider,
        connections.externalAccountId,
      ],
      set: {
        status: "active",
        metadata: { initiatedAt: new Date().toISOString() },
        updatedAt: new Date(),
      },
    });

  return { redirectUrl };
}
