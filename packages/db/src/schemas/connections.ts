import { relations } from "drizzle-orm";
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth.js";

export const connectionStatusEnum = pgEnum("connection_status", [
  "active",
  "disconnected",
  "error",
]);

export const connections = pgTable(
  "connections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    externalAccountId: text("external_account_id").notNull(),
    status: connectionStatusEnum("status").notNull().default("active"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("connections_user_id_idx").on(table.userId),
    unique("connections_user_provider_account_unique").on(
      table.userId,
      table.provider,
      table.externalAccountId,
    ),
  ],
);

export const connectionsRelations = relations(connections, ({ one }) => ({
  user: one(user, {
    fields: [connections.userId],
    references: [user.id],
  }),
}));

export type Connection = typeof connections.$inferSelect;
export type NewConnection = typeof connections.$inferInsert;
