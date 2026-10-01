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
