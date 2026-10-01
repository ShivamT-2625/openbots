import { conversations, db, messages } from "@openbots/db";
import { and, asc, desc, eq } from "drizzle-orm";

export async function listConversations(userId: string, agentId?: string) {
  const result = await db
    .select()
    .from(conversations)
    .where(
      agentId
        ? and(
            eq(conversations.userId, userId),
            eq(conversations.agentId, agentId),
          )
        : eq(conversations.userId, userId),
    )
    .orderBy(desc(conversations.updatedAt));
  return { conversations: result };
}

export async function getConversation(conversationId: string, userId: string) {
  const [conv] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, userId),
      ),
    );

  if (!conv) {
    return null;
  }

  const convMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));

  return { conversation: conv, messages: convMessages };
}
